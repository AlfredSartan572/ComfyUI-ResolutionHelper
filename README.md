# ComfyUI-ResolutionHelper
Resolution Picker and Calculator

ComfyUI has several custom nodes for selecting image resolution, but they typically require either width and height or megapixels as inputs. I wanted to specify the resolution using the vertical resolution (720p, 1080p, etc.), as is commonly done for display resolutions.

The available aspect ratio selection nodes also provide only a limited set of options. For example, many of them don't include a 16:10 aspect ratio.


# 4 nodes
## Resolution from Megapixels
Aspect Ratio + MegaPixels => Width & Height<br/>
![from_megapixels](assets/res_mega.jpg)

## Resolution from Scanlines
Aspect Ratio + Scanlines (height) => Width & Height<br/>
![from_scanlines](assets/res_scan.jpg)

## Resolution Calculator
Input Image + Scanlines (height) => Width, Height<br/>
(this just calculates the resolution, it does not resize the image)<br>
![from_calculator](assets/res_calc.jpg)

## Aspect Ratio selector
can be linked to 1 of the 2 Resolution-from nodes<br/>
![from_megapixels](assets/aspect_ratio.jpg)
