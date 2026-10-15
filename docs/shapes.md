# Custom shapes

paint.js loads custom shapes from the same `.xaml` format used by Paint.NET. Shape files contain
geometry data and do not execute JavaScript.

## Install shapes

Open **Settings → Shapes**, then use **Add shapes…** or drag one or more `.xaml` files onto the drop
area. Installed shapes are stored locally and appear in the Shapes tool's **Custom** group.

Dropping `.xaml` files onto the main paint.js window opens the same import page.

## Shape file example

Every file has a `SimpleGeometryShape` root, a display name, and geometry. This triangle uses the
compact geometry syntax supported by Paint.NET:

```xml
<ps:SimpleGeometryShape
    xmlns="clr-namespace:PaintDotNet.UI.Media;assembly=PaintDotNet.Framework"
    xmlns:ps="clr-namespace:PaintDotNet.Shapes;assembly=PaintDotNet.Framework"
    DisplayName="Triangle"
    Geometry="M 50,0 L 100,100 L 0,100 Z" />
```

paint.js also supports Paint.NET shape files built from `GeometryGroup`, `PathGeometry`,
`PathFigure`, line, arc, Bézier, rectangle, ellipse, and line geometry elements.

## Remove shapes

Return to **Settings → Shapes** to remove an individual shape or clear all installed shapes. Removing
a shape does not delete the original file from your computer.
