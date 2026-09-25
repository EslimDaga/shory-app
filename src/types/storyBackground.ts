export type GradientBackground = {
  kind: 'gradient';
  id: string;
  top: string;
  bottom: string;
};

export type PhotoBackground = {
  kind: 'photo';
  uri: string;
};

export type StoryBackground = GradientBackground | PhotoBackground;
