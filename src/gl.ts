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
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, width, height);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
};

type FramebufferAttachments = {
  colorAttachments?: WebGLTexture[];
  depthAttachment?: WebGLTexture;
  stencilAttachment?: WebGLTexture;
};
export const setFramebufferAttachments = (
  gl: WebGLRenderingContext,
  framebuffer: WebGLFramebuffer,
  {colorAttachments, depthAttachment, stencilAttachment}: FramebufferAttachments
) => {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
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
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

export const createFramebuffer = (
  gl: WebGL2RenderingContext,
  attachments: FramebufferAttachments
): WebGLFramebuffer => {
  const fb = gl.createFramebuffer();
  if (!fb) {
    throw new Error('Failed to create framebuffer');
  }
  setFramebufferAttachments(gl, fb, attachments);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('Framebuffer incomplete!');
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return fb;
};

export const createShader = (
  gl: WebGL2RenderingContext,
  {source, type}: {source: string; type: number}
): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Failed to create shader');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error('Error compiling shader:' + gl.getShaderInfoLog(shader));
  }

  return shader;
};

export const createProgram = (
  gl: WebGL2RenderingContext,
  {shaders}: {shaders: WebGLShader[]}
): WebGLProgram => {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('Failed to create program');
  }

  for (const shader of shaders) {
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Error linking program:' + gl.getProgramInfoLog(program));
  }
  return program;
};

export const createBuffer = (
  gl: WebGL2RenderingContext,
  {data, usage = gl.STATIC_DRAW}: {data: BufferSource; usage: number}
): WebGLBuffer => {
  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error('Failed to create buffer');
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  if (data) {
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buffer;
};

type VertexAttribParams = {
  buffer: WebGLBuffer;
  size: number;
  stride?: number;
  offset?: number;
};
export const createVAO = (
  gl: WebGL2RenderingContext,
  {attribs = []}: {attribs: VertexAttribParams[]}
): WebGLVertexArrayObject => {
  const vao = gl.createVertexArray();
  if (!vao) {
    throw new Error('Failed to create vertex array object');
  }
  gl.bindVertexArray(vao);
  for (let i = 0; i < attribs.length; ++i) {
    const {buffer, size, stride = 0, offset = 0} = attribs[i];
    gl.enableVertexAttribArray(i);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(i, size, gl.FLOAT, false, stride, offset);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  gl.bindVertexArray(null);
  return vao;
};

export class RenderTexture {
  gl: WebGL2RenderingContext;
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;

  constructor(gl: WebGL2RenderingContext, textureFactory: () => WebGLTexture) {
    this.gl = gl;
    this.texture = textureFactory();
    this.framebuffer = createFramebuffer(gl, {
      colorAttachments: [this.texture],
    });
  }

  delete() {
    this.gl.deleteTexture(this.texture);
    this.gl.deleteFramebuffer(this.framebuffer);
  }
}

export class PingPongTexture {
  gl: WebGL2RenderingContext;
  read: RenderTexture;
  write: RenderTexture;

  constructor(gl: WebGL2RenderingContext, textureFactory: () => WebGLTexture) {
    this.gl = gl;
    this.read = new RenderTexture(gl, textureFactory);
    this.write = new RenderTexture(gl, textureFactory);
  }

  delete() {
    this.read.delete();
    this.write.delete();
  }

  swap() {
    const temp = this.read.texture;
    this.read.texture = this.write.texture;
    this.write.texture = temp;
    setFramebufferAttachments(this.gl, this.read.framebuffer, {
      colorAttachments: [this.read.texture],
    });
    setFramebufferAttachments(this.gl, this.write.framebuffer, {
      colorAttachments: [this.write.texture],
    });
  }
}

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
