import { useState, useRef, useEffect } from 'react';
import { Upload, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { uploadFaceImage, FaceMeta } from '../services/ProfileService';

interface FaceUploadProps {
  userId: string;
  onSuccess: (faceUrl: string) => void;
  onClose: () => void;
}

export default function FaceUpload({ userId, onSuccess, onClose }: FaceUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (previewUrl && canvasRef.current) {
      drawPreview();
    }
  }, [previewUrl, scale, rotation, position]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG, PNG, and WebP images allowed');
      return;
    }

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setPreviewUrl(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function drawPreview() {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(position.x, position.y);

    const imgSize = Math.min(img.width, img.height);
    const sx = (img.width - imgSize) / 2;
    const sy = (img.height - imgSize) / 2;

    ctx.drawImage(img, sx, sy, imgSize, imgSize, -size / 2, -size / 2, size, size);

    ctx.restore();

    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    const canvas = canvasRef.current;
    if (!canvas) {
      setError('Canvas not ready');
      setIsProcessing(false);
      return;
    }

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError('Failed to process image');
        setIsProcessing(false);
        return;
      }

      const processedFile = new File([blob], 'face.png', { type: 'image/png' });

      const faceMeta: FaceMeta = {
        scale,
        rotation,
        offsetX: position.x,
        offsetY: position.y,
      };

      const result = await uploadFaceImage(userId, processedFile, faceMeta);

      if (result.success && result.face_url) {
        onSuccess(result.face_url);
      } else {
        setError(result.error || 'Upload failed');
      }

      setIsProcessing(false);
    }, 'image/png');
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full border-2 border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Upload Face (Head Only)</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!previewUrl ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-green-500 transition-colors"
              >
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-white font-medium mb-2">Click to upload or drag and drop</p>
                <p className="text-gray-400 text-sm">
                  JPG, PNG, or WebP (max 5MB)
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 space-y-2">
                <p className="font-medium text-white">Guidelines:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Only your snake's head will show this image</li>
                  <li>Body skins remain unchanged</li>
                  <li>No obscene or copyrighted images</li>
                  <li>Max 3 uploads per 24 hours</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={300}
                  className="rounded-full cursor-move shadow-lg"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300 flex items-center gap-2">
                      <ZoomIn className="w-4 h-4" />
                      Zoom: {scale.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300 flex items-center gap-2">
                      <RotateCw className="w-4 h-4" />
                      Rotate: {rotation}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    step="1"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Drag the image to reposition
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setSelectedFile(null);
                    setScale(1.0);
                    setRotation(0);
                    setPosition({ x: 0, y: 0 });
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-all disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : 'Upload Face'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900 bg-opacity-50 border border-red-600 rounded-lg p-4 text-red-200 text-sm">
              {error}
            </div>
          )}

          {isProcessing && (
            <div className="bg-blue-900 bg-opacity-50 border border-blue-600 rounded-lg p-4 text-blue-200 text-sm text-center">
              Processing your face - this may take a few seconds...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
