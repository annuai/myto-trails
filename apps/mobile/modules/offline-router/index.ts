import { requireOptionalNativeModule } from 'expo';

type Native = {
  /**
   * Runs a Valhalla `route` request (the same JSON the online server takes) against a region's routing tiles on the phone, and returns
   * Valhalla's JSON answer. The engine for a file is built on first use and kept: that is the slow part. Rejects with Valhalla's own error
   * text when there is no route (for example a stop outside the region).
   */
  route(tilesPath: string, requestJson: string): Promise<string>;
  /**
   * Unpacks a gzip file to `to`, streaming (a region's routing file is hundreds of MB unpacked), and returns the bytes written.
   * Routing files are published gzipped to save the rider's data; the engine maps the plain tar.
   */
  gunzip(from: string, to: string): Promise<number>;
  /** Frees the engine for a file, before the file is deleted or replaced. */
  close(tilesPath: string): Promise<void>;
};

/** Missing in Expo Go, on the web and in tests: routing then stays online. */
export const OfflineRouterNative = requireOptionalNativeModule<Native>('OfflineRouter');
