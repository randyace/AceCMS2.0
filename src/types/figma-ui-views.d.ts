declare module '../figma-ui/*' {
  import type { ComponentType } from 'react';

  const FigmaUIView: ComponentType<Record<string, unknown>>;
  export default FigmaUIView;
}

declare module './figma-ui/*' {
  import type { ComponentType } from 'react';

  const FigmaUIView: ComponentType<Record<string, unknown>>;
  export default FigmaUIView;
}

declare module '*figma-ui/*' {
  import type { ComponentType } from 'react';

  const FigmaUIView: ComponentType<Record<string, unknown>>;
  export default FigmaUIView;
}
