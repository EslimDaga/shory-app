import ExpoModulesCore
import UIKit

private final class ImageLoadException: GenericException<String> {
  override var reason: String { "Could not read the image at \(param)" }
}

// Draws an image (a local file or a remote URL) into a tiny size×size bitmap and returns its
// pixels as packed 0xRRGGBB integers. Clustering them into a palette happens in JavaScript.
public final class ShoryPaletteModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ShoryPalette")

    AsyncFunction("samplePixels") { (uri: String, size: Int) async throws -> [Int] in
      guard let url = URL(string: uri), url.isFileURL || url.scheme == "https" else {
        throw ImageLoadException(uri)
      }
      let data: Data?
      if url.isFileURL {
        data = FileManager.default.contents(atPath: url.path)
      } else {
        // A cover that doesn't arrive quickly just means no Magic colors, not a hung task.
        let request = URLRequest(url: url, cachePolicy: .returnCacheDataElseLoad, timeoutInterval: 10)
        data = try? await URLSession.shared.data(for: request).0
      }
      guard let data, let image = UIImage(data: data)?.cgImage else { throw ImageLoadException(uri) }

      let side = max(4, min(size, 128))
      var pixels = [UInt8](repeating: 0, count: side * side * 4)
      let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
        guard let context = CGContext(
          data: buffer.baseAddress,
          width: side,
          height: side,
          bitsPerComponent: 8,
          bytesPerRow: side * 4,
          space: CGColorSpaceCreateDeviceRGB(),
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else { return false }
        context.interpolationQuality = .medium
        context.draw(image, in: CGRect(x: 0, y: 0, width: side, height: side))
        return true
      }
      guard drawn else { throw ImageLoadException(uri) }

      var colors: [Int] = []
      colors.reserveCapacity(side * side)
      for offset in stride(from: 0, to: pixels.count, by: 4) where pixels[offset + 3] > 200 {
        colors.append(Int(pixels[offset]) << 16 | Int(pixels[offset + 1]) << 8 | Int(pixels[offset + 2]))
      }
      return colors
    }
  }
}
