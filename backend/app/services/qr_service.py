import qrcode
import uuid
import io
import base64
from PIL import Image


def generate_qr_token() -> str:
    """Generate a unique token for a student's QR code."""
    return str(uuid.uuid4())


def generate_qr_image(data: str) -> bytes:
    """Generate QR code image as PNG bytes."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer.getvalue()


def generate_qr_base64(data: str) -> str:
    """Generate QR code as base64-encoded PNG string."""
    img_bytes = generate_qr_image(data)
    return base64.b64encode(img_bytes).decode("utf-8")
