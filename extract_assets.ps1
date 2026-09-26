Add-Type -AssemblyName System.Drawing

function Crop-Image($sourcePath, $destPath, $x, $y, $w, $h) {
    $src = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))
    $cropRect = New-Object System.Drawing.Rectangle $x, $y, $w, $h
    $bmp = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $src.Dispose()
}

$desktopImg = "WhatsApp Image 2026-09-26 at 4.25.27 PM.jpeg"
$mobileImg = "WhatsApp Image 2026-09-26 at 4.25.16 PM.jpeg"

# 1. Logo from desktop mockup (around x=155, y=35, w=440, h=220)
Crop-Image $desktopImg "assets/logo.png" 150 35 430 155
Crop-Image $desktopImg "assets/logo-full.png" 150 35 430 215

# 2. Right hero mockup from desktop (phone, hand, helmet, backpack): x=940, y=200, w=660, h=700
Crop-Image $desktopImg "assets/hero-desktop.png" 940 180 660 720

# 3. Phone mockup from mobile (x=20, y=650, w=700, h=590)
Crop-Image $mobileImg "assets/hero-phone.png" 20 650 700 590

# 4. Background landscape without the left text (x=350, y=0, w=1250, h=900)
Crop-Image $desktopImg "assets/landscape.jpg" 350 0 1250 900

# 5. Full reference copies
Copy-Item $desktopImg "assets/bg-desktop.jpg"
Copy-Item $mobileImg "assets/bg-mobile.jpg"

Write-Output "Assets successfully extracted!"
