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

PIXEL_BUDGET_LIST = {
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
    "1600p": 1600,
    "1800p": 1800,
    "2160p": 2160,
    "2400p": 2400,
    "2880p": 2880,
    "3200p": 3200,
    "3456p": 3456,
    "4320p": 4320,
}


# ---------------------------------------------------------
# Node 1
# ---------------------------------------------------------

class ResolutionFromMegapixels:
    DESCRIPTION = """
Calculate Width & Height from aspect ratio and megapixel target, in 'multiple' multiples.
"""
    RETURN_TYPES = ("INT", "INT", "INT")
    RETURN_NAMES = ("width", "height", "longest",)
    OUTPUT_TOOLTIPS = (
        "",
        "",
        "",
    )
    FUNCTION = "res_from_mpix"
    CATEGORY = "Resolution Tools"

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
                        "step": 0.0001,
                    }
                ),

                "multiple": (
                    "INT",
                    {
                        "default": 32,
                        "min": 1,
                        "max": 112,
                        "step": 1,
                        "tooltip": "MiniMaxH3=32, Illustrious/Pony=8, other=16",
                    }
                ),
            }
        }

    def res_from_mpix(self, aspect_ratio, megapixels, multiple):
        aspect_width, aspect_height = ASPECT_RATIOS[aspect_ratio]

        width = math.floor( math.sqrt(megapixels * 1024 * 1024 * aspect_width / aspect_height) / multiple) * multiple
        height = math.floor( (width * aspect_height / aspect_width) / multiple) * multiple
        longest = width if width > height else height

        return (width, height, longest)


# ---------------------------------------------------------
# Node 2
# ---------------------------------------------------------

class ResolutionFromPixelBudget:
    DESCRIPTION = """
Calculate Width & Height from aspect ratio and Pixel Budget target, in 'multiple' multiples.
"""
    RETURN_TYPES = ("INT", "INT", "INT", "FLOAT",)
    RETURN_NAMES = ("width", "height", "longest", "megapixels",)
    OUTPUT_TOOLTIPS = (
        "",
        "",
        "",
        "",
    )
    FUNCTION = "res_from_budget"
    CATEGORY = "Resolution Tools"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "aspect_ratio": (
                    list(ASPECT_RATIOS.keys()),
                ),

                "pixelbudget": (
                    list(PIXEL_BUDGET_LIST.keys()),
                ),

                "multiple": (
                    "INT",
                    {
                        "default": 32,
                        "min": 1,
                        "max": 112,
                        "step": 1,
                        "tooltip": "MiniMaxH3=32, Illustrious/Pony=8, other=16",
                    }
                ),
            }
        }

    def res_from_budget(self, aspect_ratio, pixelbudget, multiple):
        aspect_width, aspect_height = ASPECT_RATIOS[aspect_ratio]
        size = int(PIXEL_BUDGET_LIST[pixelbudget])

        pixels = size * size * 16 / 9
        mpix = pixels / 1024 / 1024

        width = math.floor( math.sqrt(pixels * aspect_width / aspect_height) / multiple) * multiple
        height = math.floor( (width * aspect_height / aspect_width) / multiple) * multiple
        longest = width if width > height else height

        return (width, height, longest, mpix)


# ---------------------------------------------------------
# Node 3
# ---------------------------------------------------------

class ResolutionFromDimensions:
    DESCRIPTION = """
Calculate Width & Height from source Width & Height to match the given pixel budget, in 'multiple' multiples.
"""
    RETURN_TYPES = ("INT", "INT", "INT", "FLOAT",)
    RETURN_NAMES = ("width", "height", "longest", "megapixels",)
    OUTPUT_TOOLTIPS = (
        "",
        "",
        "",
        "",
    )
    FUNCTION = "res_from_dim"
    CATEGORY = "Resolution Tools"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "width": (
                    "INT",
                    {
                        #"default": 32,
                        "min": 8,
                        "max": 7680,
                        "step": 1,
                    }
                ),

                "height": (
                    "INT",
                    {
                        #"default": 32,
                        "min": 8,
                        "max": 7680,
                        "step": 1,
                    }
                ),

                "pixelbudget": (
                    list(PIXEL_BUDGET_LIST.keys()),
                ),

                "multiple": (
                    "INT",
                    {
                        "default": 32,
                        "min": 1,
                        "max": 112,
                        "step": 1,
                        "tooltip": "MiniMaxH3=32, Illustrious/Pony=8, other=16",
                    }
                ),
            }
        }

    def res_from_dim(self, width, height, pixelbudget, multiple):
        aspect_height = int(PIXEL_BUDGET_LIST[pixelbudget])

        scale = math.sqrt((aspect_height * aspect_height * 16.0 / 9.0) / (height * width))
        sized_width = math.floor( (width * scale) / multiple) * multiple
        sized_height = math.floor( (height * scale) / multiple) * multiple
        sized_mpix = sized_width * sized_height / 1024 / 1024
        longest = sized_width if sized_width > sized_height else sized_height

        return (sized_width, sized_height, longest, sized_mpix)


# ---------------------------------------------------------
# Node 4
# ---------------------------------------------------------

class ResolutionCalculator:
    DESCRIPTION = """
Calculate resized dimensions, using 'image' aspect ratio, in 'multiple' multiples.
"""
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

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": (
                    "IMAGE",
                ),

                "pixelbudget": (
                    list(PIXEL_BUDGET_LIST.keys()),
                ),

                "multiple": (
                    "INT",
                    {
                        "default": 32,
                        "min": 1,
                        "max": 112,
                        "step": 1,
                        "tooltip": "MiniMaxH3=32, Illustrious/Pony=8, other=16",
                    }
                ),
            }
        }

    def calculate_resolutions(self, image, pixelbudget, multiple):
        res_size = int(PIXEL_BUDGET_LIST[pixelbudget])

        input_height = image.shape[1]
        input_width = image.shape[2]

        scale = math.sqrt((res_size * res_size * 16 / 9) / (input_height * input_width))
        sized_width = math.floor( (input_width * scale) / multiple) * multiple
        sized_height = math.floor( (input_height * scale) / multiple) * multiple
        sized_mpix = sized_width * sized_height / 1024 / 1024
        longest = sized_width if sized_width > sized_height else sized_height

        return (image, sized_width, sized_height, longest, sized_mpix)


# ---------------------------------------------------------
# Node 5
# ---------------------------------------------------------

class AspectRatioSelector:
    DESCRIPTION = """
Return the Aspect Ratio that was selected from the list.
"""
    CATEGORY = "Resolution Tools"
    RETURN_TYPES = (list(ASPECT_RATIOS.keys()),)
    RETURN_NAMES = ("aspect_ratio",)
    FUNCTION = "select_ratio"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "aspect_ratio": (
                    list(ASPECT_RATIOS.keys()),
                ),
            }
        }

    def select_ratio(self, aspect_ratio):
        return (aspect_ratio,)


# ---------------------------------------------------------
# Node 6
# ---------------------------------------------------------

class PixelBudgetSelector:
    DESCRIPTION = """
Return the Pixel Budget that was selected from the list.
"""
    CATEGORY = "Resolution Tools"
    RETURN_TYPES = (list(PIXEL_BUDGET_LIST.keys()),)
    RETURN_NAMES = ("pixelbudget",)
    FUNCTION = "select_budget"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "pixelbudget": (
                    list(PIXEL_BUDGET_LIST.keys()),
                ),
            }
        }

    def select_budget(self, pixelbudget):
        return (pixelbudget,)


# ---------------------------------------------------------
# ComfyUI node registration
# ---------------------------------------------------------

NODE_CLASS_MAPPINGS = {
    "ResolutionFromMegapixels": ResolutionFromMegapixels,
    "ResolutionFromPixelBudget": ResolutionFromPixelBudget,    
    "ResolutionFromDimensions": ResolutionFromDimensions,    
    "ResolutionCalculator": ResolutionCalculator,
    "AspectRatioSelector": AspectRatioSelector,
    "PixelBudgetSelector": PixelBudgetSelector,
}


NODE_DISPLAY_NAME_MAPPINGS = {
    "ResolutionFromMegapixels": "Resolution from Megapixels",
    "ResolutionFromPixelBudget": "Resolution from PixelBudget",    
    "ResolutionFromDimensions": "Resolution from Dimensions",    
    "ResolutionCalculator": "Resolution Calculator",
    "AspectRatioSelector": "Aspect Ratio Selector",
    "PixelBudgetSelector": "Pixel Budget Selector",
}
