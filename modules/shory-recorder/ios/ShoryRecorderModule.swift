import AVFoundation
import CoreImage
import ExpoModulesCore
import UIKit

private final class RecorderNotStartedException: Exception {
  override var reason: String { "The recorder has not been started" }
}

private final class RecorderFailedException: GenericException<String> {
  override var reason: String { "Video recording failed: \(param)" }
}

// Encodes a React Native view into an H.264 MP4, frame by frame. JavaScript drives time: it
// renders the story at the instant of frame N, then asks for that frame, so every frame is exact
// no matter how long rendering takes. The view is drawn straight into the encoder's pixel buffer
// (no intermediate image files), optionally over the frames of a background video.
public final class ShoryRecorderModule: Module {
  private var writer: AVAssetWriter?
  private var input: AVAssetWriterInput?
  private var adaptor: AVAssetWriterInputPixelBufferAdaptor?
  private var size = CGSize.zero
  private var fps: Int32 = 30
  private var background: BackgroundVideo?
  private lazy var ciContext = CIContext(options: [.cacheIntermediates: false])

  public func definition() -> ModuleDefinition {
    Name("ShoryRecorder")

    // A still of a video (its first frame, upright) plus its length: the editor shows the still
    // wherever a picture of the background is needed (thumbnails, Magic colors).
    AsyncFunction("describeVideo") { (uri: String) async throws -> [String: Any] in
      guard let url = URL(string: uri) else { throw RecorderFailedException("invalid video URL") }
      let asset = AVURLAsset(url: url)
      let duration = try await asset.load(.duration)
      let generator = AVAssetImageGenerator(asset: asset)
      generator.appliesPreferredTrackTransform = true
      generator.maximumSize = CGSize(width: 1080, height: 1920)
      let (frame, _) = try await generator.image(at: .zero)
      guard let jpeg = UIImage(cgImage: frame).jpegData(compressionQuality: 0.85) else {
        throw RecorderFailedException("cannot encode the video poster")
      }
      let posterURL = FileManager.default.temporaryDirectory
        .appendingPathComponent("shory-poster-\(UUID().uuidString).jpg")
      try jpeg.write(to: posterURL)
      return ["posterUri": posterURL.absoluteString, "durationSeconds": CMTimeGetSeconds(duration)]
    }

    AsyncFunction("start") { (width: Int, height: Int, fps: Int, backgroundVideo: String?) -> String in
      self.reset()
      // Opened first: a clip that can't be read fails the export before any file is written.
      let background = try backgroundVideo.flatMap(URL.init(string:)).map(BackgroundVideo.init(url:))
      let url = FileManager.default.temporaryDirectory.appendingPathComponent("shory-\(UUID().uuidString).mp4")
      let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
      let settings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
          AVVideoAverageBitRateKey: 45_000_000,
          AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
          AVVideoExpectedSourceFrameRateKey: fps,
          AVVideoMaxKeyFrameIntervalKey: fps,
        ],
      ]
      let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
      input.expectsMediaDataInRealTime = false
      let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: [
          kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
          kCVPixelBufferWidthKey as String: width,
          kCVPixelBufferHeightKey as String: height,
          kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
          kCVPixelBufferIOSurfacePropertiesKey as String: [:],
        ]
      )
      guard writer.canAdd(input) else { throw RecorderFailedException("cannot add video input") }
      writer.add(input)
      guard writer.startWriting() else {
        throw RecorderFailedException(writer.error?.localizedDescription ?? "cannot start writing")
      }
      writer.startSession(atSourceTime: .zero)

      self.background = background
      self.writer = writer
      self.input = input
      self.adaptor = adaptor
      self.size = CGSize(width: width, height: height)
      self.fps = Int32(fps)
      return url.absoluteString
    }

    AsyncFunction("appendView") { (view: UIView, index: Int) in
      guard let input = self.input, let adaptor = self.adaptor, let pool = adaptor.pixelBufferPool else {
        throw RecorderNotStartedException()
      }
      var buffer: CVPixelBuffer?
      CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer)
      guard let pixelBuffer = buffer else { throw RecorderFailedException("no pixel buffer") }

      let seconds = Double(index) / Double(self.fps)
      if let frame = self.background?.frame(at: seconds) {
        self.ciContext.render(self.aspectFill(frame), to: pixelBuffer)
      }

      CVPixelBufferLockBaseAddress(pixelBuffer, [])
      guard let context = CGContext(
        data: CVPixelBufferGetBaseAddress(pixelBuffer),
        width: Int(self.size.width),
        height: Int(self.size.height),
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
      ) else {
        CVPixelBufferUnlockBaseAddress(pixelBuffer, [])
        throw RecorderFailedException("no drawing context")
      }
      if self.background == nil {
        context.clear(CGRect(origin: .zero, size: self.size))
      }
      // UIKit draws top-down and in points; flip and scale the bitmap context to match, so the
      // view renders its vector content (text, shapes) natively at the output resolution.
      let bounds = view.bounds
      context.translateBy(x: 0, y: self.size.height)
      context.scaleBy(x: self.size.width / bounds.width, y: -self.size.height / bounds.height)
      UIGraphicsPushContext(context)
      view.drawHierarchy(in: bounds, afterScreenUpdates: false)
      UIGraphicsPopContext()
      CVPixelBufferUnlockBaseAddress(pixelBuffer, [])

      var waited = 0
      while !input.isReadyForMoreMediaData && waited < 400 {
        Thread.sleep(forTimeInterval: 0.005)
        waited += 1
      }
      let time = CMTime(value: CMTimeValue(index), timescale: self.fps)
      if !adaptor.append(pixelBuffer, withPresentationTime: time) {
        throw RecorderFailedException(self.writer?.error?.localizedDescription ?? "cannot append frame")
      }
    }
    .runOnQueue(.main)

    AsyncFunction("finish") { (promise: Promise) in
      guard let writer = self.writer, let input = self.input else {
        promise.reject(RecorderNotStartedException())
        return
      }
      input.markAsFinished()
      writer.finishWriting {
        if writer.status == .completed {
          promise.resolve(writer.outputURL.absoluteString)
        } else {
          promise.reject(RecorderFailedException(writer.error?.localizedDescription ?? "cannot finish"))
        }
        self.reset()
      }
    }

    AsyncFunction("cancel") {
      let url = self.writer?.outputURL
      self.writer?.cancelWriting()
      if let url { try? FileManager.default.removeItem(at: url) }
      self.reset()
    }
  }

  private func aspectFill(_ image: CIImage) -> CIImage {
    let extent = image.extent
    let scale = max(size.width / extent.width, size.height / extent.height)
    let scaled = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let offsetX = (size.width - scaled.extent.width) / 2 - scaled.extent.minX
    let offsetY = (size.height - scaled.extent.height) / 2 - scaled.extent.minY
    return scaled
      .transformed(by: CGAffineTransform(translationX: offsetX, y: offsetY))
      .cropped(to: CGRect(origin: .zero, size: size))
  }

  private func reset() {
    writer = nil
    input = nil
    adaptor = nil
    background = nil
  }
}

// Reads a video's frames in order, upright (its rotation applied), looping when the story is
// longer than the clip.
private final class BackgroundVideo {
  private let asset: AVAsset
  private let composition: AVVideoComposition
  private let duration: Double
  private var reader: AVAssetReader?
  private var output: AVAssetReaderVideoCompositionOutput?
  private var current: CIImage?
  private var next: CMSampleBuffer?
  private var loopStart = 0.0

  init(url: URL) throws {
    asset = AVURLAsset(url: url)
    composition = AVMutableVideoComposition(propertiesOf: asset)
    duration = CMTimeGetSeconds(asset.duration)
    guard duration > 0 else { throw RecorderFailedException("the background video is empty") }
    try openReader()
  }

  private func openReader() throws {
    let reader = try AVAssetReader(asset: asset)
    let tracks = asset.tracks(withMediaType: .video)
    guard !tracks.isEmpty else { throw RecorderFailedException("the background video has no video track") }
    let output = AVAssetReaderVideoCompositionOutput(
      videoTracks: tracks,
      videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
    )
    output.videoComposition = composition
    output.alwaysCopiesSampleData = false
    reader.add(output)
    reader.startReading()
    self.reader = reader
    self.output = output
    next = output.copyNextSampleBuffer()
  }

  func frame(at seconds: Double) -> CIImage? {
    var local = seconds - loopStart
    if local >= duration {
      loopStart += duration * floor(local / duration)
      local = seconds - loopStart
      try? openReader()
      current = nil
    }
    while let sample = next, CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample)) <= local + 0.0001 {
      if let pixels = CMSampleBufferGetImageBuffer(sample) {
        current = CIImage(cvPixelBuffer: pixels)
      }
      next = output?.copyNextSampleBuffer()
    }
    if current == nil, let sample = next, let pixels = CMSampleBufferGetImageBuffer(sample) {
      current = CIImage(cvPixelBuffer: pixels)
    }
    return current
  }
}
