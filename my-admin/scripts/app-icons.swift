// Erzeugt die App-Symbole (public/icon-*.png, apple-touch-icon.png und die
// Bilder für favicon.ico) aus der Logo-Vorlage. macOS:
//   swift scripts/app-icons.swift "<Logo.jpg>" <Zielordner>
// favicon.ico setzt sich aus ico-16 … ico-256 zusammen (PNG-Einträge).

import AppKit
let a = CommandLine.arguments
let quelle = NSBitmapImageRep(data: NSImage(contentsOfFile: a[1])!.tiffRepresentation!)!
let ziel = a[2]
let w = quelle.pixelsWide, h = quelle.pixelsHigh
// weiße Silhouette mit weichen Kanten aus dem schwarzen Logo
let sil = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
for y in 0..<h { for x in 0..<w {
  let g = quelle.colorAt(x: x, y: y)!.usingColorSpace(.deviceGray)!.whiteComponent
  sil.setColor(NSColor(deviceRed: 1, green: 1, blue: 1, alpha: max(0, min(1, (0.85 - g) / 0.7))), atX: x, y: y)
} }
let silhouette = NSImage(size: NSSize(width: w, height: h)); silhouette.addRepresentation(sil)
let ausschnitt = NSRect(x: CGFloat(w) * 0.15, y: CGFloat(h) * 0.12, width: CGFloat(w) * 0.70, height: CGFloat(h) * 0.76)
let oben = NSColor(deviceRed: 0.20, green: 0.56, blue: 0.98, alpha: 1)
let unten = NSColor(deviceRed: 0.03, green: 0.31, blue: 0.70, alpha: 1)

func icon(_ px: Int, rund: Bool, inhalt: CGFloat, datei: String) {
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  let ctx = NSGraphicsContext(bitmapImageRep: rep)!
  ctx.imageInterpolation = .high
  NSGraphicsContext.current = ctx
  let s = CGFloat(px)
  let flaeche = NSRect(x: 0, y: 0, width: s, height: s)
  let form = rund ? NSBezierPath(roundedRect: flaeche.insetBy(dx: s * 0.02, dy: s * 0.02), xRadius: s * 0.22, yRadius: s * 0.22) : NSBezierPath(rect: flaeche)
  NSGradient(starting: oben, ending: unten)!.draw(in: form, angle: -90)
  // dezenter Glanz oben
  if rund && px >= 48 {
    NSGraphicsContext.saveGraphicsState(); form.addClip()
    NSGradient(starting: NSColor(deviceWhite: 1, alpha: 0.18), ending: NSColor(deviceWhite: 1, alpha: 0))!.draw(in: NSRect(x: 0, y: s * 0.5, width: s, height: s * 0.5), angle: -90)
    NSGraphicsContext.restoreGraphicsState()
  }
  let innen = s * inhalt
  let f = min(innen / ausschnitt.width, innen / ausschnitt.height)
  let dw = ausschnitt.width * f, dh = ausschnitt.height * f
  let r = NSRect(x: (s - dw) / 2 + s * 0.01, y: (s - dh) / 2, width: dw, height: dh)
  if px >= 48 {
    NSGraphicsContext.saveGraphicsState()
    let schatten = NSShadow(); schatten.shadowColor = NSColor(deviceWhite: 0, alpha: 0.28); schatten.shadowOffset = NSSize(width: 0, height: -s * 0.012); schatten.shadowBlurRadius = s * 0.03
    schatten.set()
    silhouette.draw(in: r, from: ausschnitt, operation: .sourceOver, fraction: 1)
    NSGraphicsContext.restoreGraphicsState()
  } else {
    silhouette.draw(in: r, from: ausschnitt, operation: .sourceOver, fraction: 1)
  }
  NSGraphicsContext.restoreGraphicsState()
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(ziel)/\(datei)"))
}
// App-/Desktop-Symbole (abgerundet), kleine Größen mit mehr Inhalt
icon(512, rund: true, inhalt: 0.70, datei: "icon-512.png")
icon(192, rund: true, inhalt: 0.70, datei: "icon-192.png")
icon(256, rund: true, inhalt: 0.72, datei: "ico-256.png")
icon(64, rund: true, inhalt: 0.76, datei: "ico-64.png")
icon(48, rund: true, inhalt: 0.78, datei: "ico-48.png")
icon(32, rund: true, inhalt: 0.84, datei: "ico-32.png")
icon(24, rund: true, inhalt: 0.86, datei: "ico-24.png")
icon(16, rund: true, inhalt: 0.90, datei: "ico-16.png")
// maskable (Android/ChromeOS schneiden selbst zu): randlos, Inhalt in der Schutzzone
icon(512, rund: false, inhalt: 0.56, datei: "icon-maskable-512.png")
// Apple (iOS rundet selbst ab): randlos
icon(180, rund: false, inhalt: 0.68, datei: "apple-touch-icon.png")
