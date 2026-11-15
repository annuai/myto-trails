import Compression
import ExpoModulesCore
import Foundation
import Valhalla
import ValhallaConfigModels

/** Valhalla on the phone: one engine per routing-tiles file, built on first use (it maps the file) and kept until closed. */
public class OfflineRouterModule: Module {
  private var engines: [String: Valhalla] = [:]
  private let lock = NSLock()
  /** One request at a time: a Valhalla engine is not safe to use from two threads at once. */
  private let routeLock = NSLock()

  private func engine(for path: String) throws -> Valhalla {
    lock.lock(); defer { lock.unlock() }
    if let e = engines[path] { return e }
    guard FileManager.default.fileExists(atPath: path) else { throw OfflineRouterError.noTiles(path) }
    let config = try ValhallaConfig(tileExtractTar: URL(fileURLWithPath: path))
    // Each file gets its own config name: two engines writing one config would point both at the same tiles.
    let name = "valhalla-\(URL(fileURLWithPath: path).deletingPathExtension().lastPathComponent).json"
    let e = try Valhalla(config, configName: name)
    engines[path] = e
    return e
  }

  public func definition() -> ModuleDefinition {
    Name("OfflineRouter")

    AsyncFunction("route") { (path: String, request: String) -> String in
      self.routeLock.lock(); defer { self.routeLock.unlock() }
      return try self.engine(for: plainPath(path)).route(rawRequest: request)
    }

    AsyncFunction("gunzip") { (from: String, to: String) -> Int64 in
      return try gunzip(from: plainPath(from), to: plainPath(to))
    }

    AsyncFunction("close") { (path: String) in
      self.lock.lock(); defer { self.lock.unlock() }
      self.engines.removeValue(forKey: plainPath(path))?.close()
    }
  }
}

/** The app passes `file://` URIs (expo-file-system's form); the engine and FileHandle want plain paths. */
func plainPath(_ p: String) -> String {
  p.hasPrefix("file://") ? (URL(string: p)?.path ?? String(p.dropFirst(7))) : p
}

/**
 * Streams a single-member gzip file through Apple's Compression framework. Compression's zlib is raw DEFLATE, so the gzip header (RFC 1952)
 * is read here and the 8-byte trailer is not fed in; a damaged stream throws, and the caller checks the unpacked size.
 */
func gunzip(from src: String, to dst: String) throws -> Int64 {
  guard let input = FileHandle(forReadingAtPath: src) else { throw OfflineRouterError.badGzip("cannot open \(src)") }
  defer { try? input.close() }
  let size = (try FileManager.default.attributesOfItem(atPath: src)[.size] as? NSNumber)?.int64Value ?? 0
  let header = input.readData(ofLength: 10)
  guard header.count == 10, header[0] == 0x1f, header[1] == 0x8b, header[2] == 8 else { throw OfflineRouterError.badGzip("not a gzip file") }
  let flags = header[3]
  if flags & 0x04 != 0 { let x = input.readData(ofLength: 2); guard x.count == 2 else { throw OfflineRouterError.badGzip("short header") }; _ = input.readData(ofLength: Int(x[0]) | Int(x[1]) << 8) }
  func skipZeroTerminated() { while let b = input.readData(ofLength: 1).first, b != 0 {} }
  if flags & 0x08 != 0 { skipZeroTerminated() }
  if flags & 0x10 != 0 { skipZeroTerminated() }
  if flags & 0x02 != 0 { _ = input.readData(ofLength: 2) }
  var remaining = size - Int64(input.offsetInFile) - 8
  guard remaining > 0 else { throw OfflineRouterError.badGzip("empty") }

  FileManager.default.createFile(atPath: dst, contents: nil)
  guard let output = FileHandle(forWritingAtPath: dst) else { throw OfflineRouterError.badGzip("cannot write \(dst)") }
  defer { try? output.close() }
  var written: Int64 = 0
  let filter = try OutputFilter(.decompress, using: .zlib) { data in
    if let data { output.write(data); written += Int64(data.count) }
  }
  while remaining > 0 {
    try autoreleasepool {
      let chunk = input.readData(ofLength: Int(min(remaining, 1 << 20)))
      if chunk.isEmpty { remaining = 0; return }
      remaining -= Int64(chunk.count)
      try filter.write(chunk)
    }
  }
  try filter.finalize()
  return written
}

enum OfflineRouterError: Error, CustomStringConvertible {
  case noTiles(String)
  case badGzip(String)
  var description: String {
    switch self {
    case .noTiles(let p): return "No routing tiles at \(p)"
    case .badGzip(let why): return "Could not unpack the routing file: \(why)"
    }
  }
}
