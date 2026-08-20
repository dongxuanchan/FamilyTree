"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface Props {
  imageSrc: string; // data URL của ảnh gốc user vừa chọn
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const FRAME_SIZE = 260; // kích thước khung crop hiển thị trên màn hình (px)
const OUTPUT_SIZE = 320; // kích thước ảnh avatar xuất ra cuối cùng (px)

export default function ImageCropper({ imageSrc, onConfirm, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  // Load ảnh gốc, tính scale nhỏ nhất để ảnh luôn phủ kín khung vuông (giống CSS object-fit: cover)
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const cover = Math.max(FRAME_SIZE / img.width, FRAME_SIZE / img.height);
      setNaturalSize({ width: img.width, height: img.height });
      setMinScale(cover);
      setScale(cover);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Giới hạn offset để ảnh không bao giờ bị kéo hở ra khỏi khung crop
  const clampOffset = useCallback(
    (x: number, y: number, currentScale: number) => {
      const drawWidth = naturalSize.width * currentScale;
      const drawHeight = naturalSize.height * currentScale;
      const maxOffsetX = Math.max(0, (drawWidth - FRAME_SIZE) / 2);
      const maxOffsetY = Math.max(0, (drawHeight - FRAME_SIZE) / 2);
      return {
        x: Math.min(maxOffsetX, Math.max(-maxOffsetX, x)),
        y: Math.min(maxOffsetY, Math.max(-maxOffsetY, y))
      };
    },
    [naturalSize]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const drawX = (FRAME_SIZE - drawWidth) / 2 + offset.x;
    const drawY = (FRAME_SIZE - drawHeight) / 2 + offset.y;
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }, [scale, offset]);

  useEffect(() => {
    draw();
  }, [draw]);

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset(clampOffset(dragState.current.startOffsetX + dx, dragState.current.startOffsetY + dy, scale));
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function handleScaleChange(newScale: number) {
    setScale(newScale);
    setOffset((prev) => clampOffset(prev.x, prev.y, newScale));
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img) return;
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = OUTPUT_SIZE;
    outputCanvas.height = OUTPUT_SIZE;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    // Vẽ lại ở độ phân giải cao hơn (OUTPUT_SIZE) nhưng giữ đúng tỉ lệ phóng to/vị trí
    // mà user nhìn thấy trên khung xem trước (FRAME_SIZE) - nhân theo "ratio" để phần
    // ảnh crop ra khớp 100% với preview, không lệch.
    const ratio = OUTPUT_SIZE / FRAME_SIZE;
    const drawWidth = img.width * scale * ratio;
    const drawHeight = img.height * scale * ratio;
    const drawX = (OUTPUT_SIZE - drawWidth) / 2 + offset.x * ratio;
    const drawY = (OUTPUT_SIZE - drawHeight) / 2 + offset.y * ratio;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    onConfirm(outputCanvas.toDataURL("image/jpeg", 0.9));
  }

  return (
    <div className="modal-overlay cropper-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Điều chỉnh ảnh đại diện</h3>

        <div className="cropper-frame">
          <canvas
            ref={canvasRef}
            width={FRAME_SIZE}
            height={FRAME_SIZE}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          <div className="cropper-frame__guide" />
        </div>

        <label>
          Phóng to / thu nhỏ
          <input
            type="range"
            min={minScale}
            max={minScale * 6}
            step={0.01}
            value={scale}
            onChange={(e) => handleScaleChange(Number(e.target.value))}
          />
        </label>
        <p className="cropper-hint">Kéo ảnh để di chuyển vị trí muốn cắt.</p>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className="btn" onClick={handleConfirm}>
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}