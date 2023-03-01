import {createTexture2D, RenderTexture, setTextureStorage} from './gl/gl';

export type DisplayTextures = {
  thickness: RenderTexture | null;
};

export const allocateDisplayTextures = (): DisplayTextures => ({
  thickness: null,
});

export const resizeDisplayTextures = (
  gl: WebGL2RenderingContext,
  textures: DisplayTextures,
  {width, height}: {width: number; height: number}
) => {
  if (textures.thickness) textures.thickness.delete();
  textures.thickness = new RenderTexture(gl, () =>
    createTexture2D(gl, {
      internalFormat: gl.RGBA16F,
      width,
      height,
    })
  );
};
