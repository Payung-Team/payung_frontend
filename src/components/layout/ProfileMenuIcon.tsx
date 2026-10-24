import { Icon } from '../ui/Icon';

/**
 * ไอคอนหน้าเมนูในเมนูโปรไฟล์ (มุมขวาบน) — PYG-702
 * เดิมแต่ละเมนูใช้สีพื้นคนละสี (ฟ้า เขียว เทา แดง ส้ม) ดูไม่เข้ากับธีม
 * ตอนนี้ทุกเมนูใช้ชุดสีเดียวกันของ Payung: พื้นเขียวอ่อน + ไอคอนเส้นสีเขียวหลัก
 */
export default function ProfileMenuIcon({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#E8F5EF]">
      {/* index.css บังคับทุก variant ใช้ฟอนต์ 'Material Icons' (แบบทึบ) จึงต้องระบุฟอนต์เส้นตรงนี้ */}
      <Icon
        name={name}
        variant="outlined"
        color="#009265"
        style={{ fontSize: 20, fontFamily: "'Material Icons Outlined'" }}
      />
    </span>
  );
}
