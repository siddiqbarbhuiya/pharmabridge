import { v2 as cloudinary } from 'cloudinary'
import { config } from '../config'

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key:    config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
})

export function generateSignedUploadParams(folder: string, userId: string) {
  const timestamp = Math.round(Date.now() / 1000)
  const publicId   = `${folder}/${userId}-${timestamp}`
  const paramsToSign = { folder, public_id: publicId, timestamp }
  const signature  = cloudinary.utils.api_sign_request(paramsToSign, config.CLOUDINARY_API_SECRET)

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}/image/upload`,
    publicId,
    signature,
    timestamp,
    apiKey:    config.CLOUDINARY_API_KEY,
    cloudName: config.CLOUDINARY_CLOUD_NAME,
  }
}
