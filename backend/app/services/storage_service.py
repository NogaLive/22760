import os
import boto3
from botocore.config import Config
from datetime import datetime

from app.config import get_settings

class StorageService:
    def __init__(self):
        settings = get_settings()
        full_url = settings.SUPABASE_URL
        self.s3_key = settings.SUPABASE_KEY
        self.bucket = settings.SUPABASE_BUCKET
        self.region = settings.SUPABASE_REGION
        
        # Use explicit S3 credentials from settings
        access_key = settings.S3_ACCESS_KEY
        secret_key = settings.S3_SECRET_KEY
        
        try:
            # URL: https://[ref].storage.supabase.co/storage/v1/s3
            self.project_ref = full_url.split('//')[1].split('.')[0]
        except Exception:
            self.project_ref = "supabase"

        self.s3_client = boto3.client(
            's3',
            endpoint_url=full_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=self.region,
            config=Config(s3={'addressing_style': 'path'})
        )

    def upload_file(self, file_content, file_name, content_type):
        """Upload a file to Supabase Storage and return the public URL."""
        if not file_name:
            file_name = "archivo_sin_nombre"
            
        # Generate a unique path: folder by year/month
        now = datetime.now()
        timestamp = now.strftime("%Y%m%d_%H%M%S")
        # Sanitize filename: remove non-ascii and spaces
        safe_name = "".join(c for c in file_name if c.isalnum() or c in "._-").replace(" ", "_")
        unique_name = f"{timestamp}_{safe_name}"
        path = f"{now.year}/{now.month}/{unique_name}"
        
        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=path,
                Body=file_content,
                ContentType=content_type
            )
        except Exception as e:
            print(f"DEBUG: S3 Upload Error: {str(e)}")
            print(f"DEBUG: Bucket: {self.bucket}, Key: {path}")
            raise e
        
        # Public URL format for Supabase Storage
        public_url = f"https://{self.project_ref}.supabase.co/storage/v1/object/public/{self.bucket}/{path}"
        return public_url

storage_service = StorageService()
