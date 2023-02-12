export const createTexture2D = (
  gl: WebGL2RenderingContext,
  {
    internalFormat,
    width,
    height,
  }: {internalFormat: number; width: number; height: number}
): WebGLTexture => {
  const tex = gl.createTexture();
  if (!tex) {
    throw new Error('Failed to create texture');
  }
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, width, height);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
};

export const createFramebuffer = (
  gl: WebGL2RenderingContext,
  {
    colorAttachments,
    depthAttachment,
    stencilAttachment,
  }: {
    colorAttachments?: WebGLTexture[];
    depthAttachment?: WebGLTexture;
    stencilAttachment?: WebGLTexture;
  }
): WebGLFramebuffer => {
  const fb = gl.createFramebuffer();
  if (!fb) {
    throw new Error('Failed to create framebuffer');
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  if (colorAttachments) {
    if (colorAttachments.length > 16) {
      throw new Error('Too many color attachments');
    }
    for (let i = 0; i < colorAttachments.length; ++i) {
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl[`COLOR_ATTACHMENT${i}`],
        gl.TEXTURE_2D,
        colorAttachments[i],
        0
      );
    }
  }
  if (depthAttachment) {
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.TEXTURE_2D,
      depthAttachment,
      0
    );
  }
  if (stencilAttachment) {
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.STENCIL_ATTACHMENT,
      gl.TEXTURE_2D,
      stencilAttachment,
      0
    );
  }
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('Framebuffer incomplete!');
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return fb;
};

export const enableFloatTexture = (gl: WebGL2RenderingContext): boolean => {
  // try enabling relevant extensions
  gl.getExtension('OES_texture_float');
  gl.getExtension('EXT_color_buffer_float');

  // try to create a float texture and bind to framebuffer
  const tex = createTexture2D(gl, {
    internalFormat: gl.RGBA32F,
    width: 1,
    height: 1,
  });
  let fb: WebGLFramebuffer | null = null;
  try {
    fb = createFramebuffer(gl, {colorAttachments: [tex]});
    return true;
  } catch (e) {
    return false;
  } finally {
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(tex);
  }
};
