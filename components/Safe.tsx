"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode; // แสดงแทนเมื่อพัง (ไม่ใส่ = ไม่แสดงอะไร)
  onError?: () => void;
};

// กันพังทั้งหน้า: ถ้าส่วนข้างในโหลดไม่สำเร็จ (เช่น เน็ตหลุดตอนโหลดภาพโลกหรือโมเดล)
// ให้แสดง fallback แทนเฉพาะส่วนนั้น ส่วนอื่นของหน้ายังใช้ได้ตามปกติ
// (React จับ error ระหว่าง render ได้ด้วย class component ที่มี getDerivedStateFromError เท่านั้น)
export default class Safe extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("Part of the showroom failed to load and was hidden:", error);
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
