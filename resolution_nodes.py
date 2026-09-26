import math

ASPECT_RATIOS = {
    "32:9 (Super Ultrawide)": (32,9),
    "21:9 (Ultrawide)": (21, 9),
    "16:9 (Widescreen)": (16, 9),
    "16:10 (WUXGA)": (16, 10),
    "5:4 (5:4 Standard)": (5, 4),
    "4:3 (Standard)": (4, 3),
    "3:2 (Photo)": (3, 2),
    "1:1 (Square)": (1, 1),
    "2:3 (Portrait Photo)": (2, 3),
    "3:4 (Portrait Standard)": (3, 4),
    "4:5 (Portrait 5:4 Standard)": (4, 5),
    "10:16 (Portrait WUXGA)": (10, 16),
    "9:16 (Portrait Widescreen)": (9, 16),
    "9:21 (Portrait Ultrawide)": (9, 21),
    "9:32 (Portrait Super Ultrawide)": (9, 32),
}

SCANLINE_LIST = {
    "240p": 240,
    "360p": 360,
    "480p": 480,
    "544p": 544,
    "640p": 640,
    "720p": 720,
    "768p": 768,
    "864p": 864,
    "1024p": 1024,
    "1080p": 1080,
    "1200p": 1200,
    "1440p": 1440,
}



# ---------------------------------------------------------
# Node 1
# ---------------------------------------------------------

class ResolutionFromMegapixels:

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "aspect_ratio": (
                    list(ASPECT_RATIOS.keys()),
                ),

                "megapixels": (
                    "FLOAT",
                    {
                        "default": 1.0,
                        "min": 0.05,
                        "max": 50.0,
                        "step": 0.1,
                    }
                ),

                "step": (
                    "INT",
                    {
                        "default": 32,
                        "min": 1,
                        "max": 112,
                        "step": 1,
                        "tooltip": "MiniMaxH3=32, Illustrious/Pony=64, other=16",
                    }
                ),
            }
        }

    RETURN_TYPES = ("INT", "INT", "INT")
    RETURN_NAMES = ("width", "height", "longest",)
    OUTPUT_TOOLTIPS = (
        "",
        "",
        "",
    )
    FUNCTION = "res_from_mpix"
    CATEGORY = "Resolution Tools"
    DESCRIPTION = """
Calculate Width & Height from aspect ratio and megapixel target, in 'step' multiples.
"""

    def res_from_mpix(self, aspect_ratio, megapixels, step):

        aspect_width, aspect_height = ASPECT_RATIOS[aspect_ratio]

        width = math.floor( math.sqrt(megapixels * 1024 * 1024 * aspect_width / aspect_height) / step) * step
        height = math.floor( (width * aspect_height / aspect_width) / step) * step
        longest = width if width > height else height

        return (width, height, longest)


# ---------------------------------------------------------
# Node 2
# ---------------------------------------------------------

class ResolutionFromScanlines:

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "aspect_ratio": (
                    list(ASPECT_RATIOS.keys()),
                ),

                "scanlines": (
                    list(SCANLINE_LIST.keys()),
                ),

                "step": (
                    "INT",
                    {
                        "default": 32,
                        "min": 1,
                        "max": 112,
                        "step": 1,
                        "tooltip": "MiniMaxH3=32, Illustrious/Pony=64, other=16",
                    }
                ),
            }
        }

    RETURN_TYPES = ("INT", "INT", "INT", "FLOAT",)
    RETURN_NAMES = ("width", "height", "longest", "megapixels",)
    OUTPUT_TOOLTIPS = (
        "",
        "",
        "",
        "",
    )
    FUNCTION = "res_from_size"
    CATEGORY = "Resolution Tools"
    DESCRIPTION = """
Calculate Width & Height from aspect ratio and scanlines target, in 'step' multiples.
"""

    def res_from_size(self, aspect_ratio, scanlines, step):

        aspect_width, aspect_height = ASPECT_RATIOS[aspect_ratio]
        size = int(SCANLINE_LIST[scanlines])

        pixels = size * size * 16 / 9
        mpix = pixels / 1024 / 1024

        width = math.floor( math.sqrt(pixels * aspect_width / aspect_height) / step) * step
        height = math.floor( (width * aspect_height / aspect_width) / step) * step
        longest = width if width > height else height

        return (width, height, longest, mpix)


# ---------------------------------------------------------
# Node 3
# ---------------------------------------------------------

class ResolutionCalculator:

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": (
                    "IMAGE",
                ),

                "scanlines": (
                    list(SCANLINE_LIST.keys()),
                ),

                "step": (
                    "INT",
                    {
                        "default": 32,
                        "min": 1,
                        "max": 112,
                        "step": 1,
                        "tooltip": "MiniMaxH3=32, Illustrious/Pony=64, other=16",
                    }
                ),
            }
        }

    RETURN_TYPES = ("IMAGE", "INT", "INT", "INT", "FLOAT",)
    RETURN_NAMES = ("image", "width", "height", "longest", "megapixels",)
    OUTPUT_TOOLTIPS = (
        "passthrough of input image",
        "Width for resized image",
        "Height for resized image",
        "Longest edge for resized image"
        "Megapixels for resized image",
    )
    FUNCTION = "calculate_resolutions"
    CATEGORY = "Resolution Tools"
    DESCRIPTION = """
Calculate resized dimensions, using 'image' aspect ratio, in 'step' multiples.
"""

    def calculate_resolutions(self, image, scanlines, step):

        res_size = int(SCANLINE_LIST[scanlines])

        input_height = image.shape[1]
        input_width = image.shape[2]

        scale = math.sqrt((res_size * res_size * 16 / 9) / (input_height * input_width))
        sized_width = math.floor( (input_width * scale) / step) * step
        sized_height = math.floor( (input_height * scale) / step) * step
        sized_mpix = sized_width * sized_height / 1024 / 1024
        longest = sized_width if sized_width > sized_height else sized_height

        return (
            image,
            sized_width,
            sized_height,
            longest,
            sized_mpix,
        )


# ---------------------------------------------------------
# ComfyUI node registration
# ---------------------------------------------------------

NODE_CLASS_MAPPINGS = {
    "ResolutionFromMegapixels": ResolutionFromMegapixels,
    "ResolutionFromScanlines": ResolutionFromScanlines,    
    "ResolutionCalculator": ResolutionCalculator,
}


NODE_DISPLAY_NAME_MAPPINGS = {
    "ResolutionFromMegapixels": "Resolution from Megapixels",
    "ResolutionFromScanlines": "Resolution from Scanlines",    
    "ResolutionCalculator": "Resolution Calculator",
}
