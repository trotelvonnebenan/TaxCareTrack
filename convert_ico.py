import struct
import os

def png_to_ico(png_path, ico_path):
    try:
        with open(png_path, 'rb') as f:
            png_data = f.read()

        if png_data[:8] != b'\x89PNG\r\n\x1a\n':
            print("Not a valid PNG file")
            return

        width = struct.unpack('>I', png_data[16:20])[0]
        height = struct.unpack('>I', png_data[20:24])[0]
        
        print(f"PNG size: {width}x{height}")
        
        ico_header = struct.pack('<HHH', 0, 1, 1)
        w_byte = 0 if width >= 256 else width
        h_byte = 0 if height >= 256 else height
        
        size = len(png_data)
        offset = 6 + 16
        
        directory = struct.pack('<BBBBHHII', w_byte, h_byte, 0, 0, 1, 32, size, offset)
        
        with open(ico_path, 'wb') as f:
            f.write(ico_header)
            f.write(directory)
            f.write(png_data)
            
        print(f"Created {ico_path}")
    except Exception as e:
        print(f"Failed to create ICO: {e}")

try:
    png_to_ico('resources/icons/appicon.png', 'resources/icons/app.ico')
except Exception as e:
    print(f"Error: {e}")
