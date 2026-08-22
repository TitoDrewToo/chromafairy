declare module "heic-convert" {
  type ConversionOptions = {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality?: number;
  };

  function convert(options: ConversionOptions): Promise<Buffer>;
  export = convert;
}
