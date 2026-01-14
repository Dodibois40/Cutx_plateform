declare module 'dxf' {
  export class Helper {
    constructor(dxfContent: string);
    parsed: {
      entities?: unknown[];
      blocks?: Record<string, unknown>;
    };
    denormalised: Array<{
      type: string;
      layer?: string;
      closed?: boolean;
      vertices?: Array<{ x: number; y: number }>;
      string?: string;
      text?: string;
      x?: number;
      y?: number;
      [key: string]: unknown;
    }>;
    toSVG(): string;
    toPolylines(): unknown[];
  }
}
