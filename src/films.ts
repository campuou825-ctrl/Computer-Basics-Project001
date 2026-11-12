/**
 * Film & Topic definitions, image sheets and crop coordinates for Computer Basics.
 */

export interface SheetInfo {
  url: string;
  w: number;
  h: number;
}

export const SHEETS: Record<string, SheetInfo> = {
  covers: {
    url: '/assets/aistudio/_______________________________________15546d2e.png',
    w: 1254,
    h: 1254,
  },
  spines: {
    url: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261029_010738_a3e47ead-18f2-4974-9468-06d16a25edc5.png&w=2688&q=85',
    w: 2688,
    h: 1152,
  },
  fix: {
    url: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261029_010831_3ebb874b-93dc-433e-87ed-6299aba720f0.png&w=1520&q=85',
    w: 1520,
    h: 2688,
  },
  fix2: {
    url: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261029_092020_f96bc094-db7b-46de-9298-074a24e0a3b8.png&w=1520&q=85',
    w: 1520,
    h: 2688,
  },
};

export interface CropBox {
  sheet: 'covers' | 'spines' | 'fix' | 'fix2';
  x: number;
  y: number;
  w: number;
  h: number;
}

import { CHAPTER_CONTENTS, ChapterContent, getChapterContent } from './course-content';

export interface Film {
  id: string;
  chapterNumber: number;
  title: string;
  titleTh: string;
  romaji: string;
  kanji: string;
  year: number;
  genre: string;
  minutes: number;
  synopsis: string;
  accentColor: string;
  spineCrop: CropBox;
  coverCrop: CropBox;
  content: ChapterContent;
}

export const FILMS: Film[] = [
  {
    id: 'intro',
    chapterNumber: 1,
    title: 'Introduction',
    titleTh: 'ความรู้เบื้องต้นเกี่ยวกับคอมพิวเตอร์',
    romaji: 'บทที่ 1 / CHAPTER 01',
    kanji: 'ความรู้เบื้องต้นเกี่ยวกับคอมพิวเตอร์',
    year: 1980,
    genre: 'Fundamentals',
    minutes: 45,
    synopsis:
      'คอมพิวเตอร์ คือ อุปกรณ์อิเล็กทรอนิกส์ที่ถูกออกแบบมาเพื่อรับข้อมูล ประมวลผล จัดเก็บ และแสดงผลลัพธ์ตามคำสั่ง โดยทำงานผ่าน 4 ขั้นตอน: Input, Process, Output และ Storage พร้อมองค์ประกอบพื้นฐาน 5 ประการ',
    accentColor: '#00E5FF',
    spineCrop: { sheet: 'spines', x: 266, y: 31, w: 189, h: 1089 },
    coverCrop: { sheet: 'covers', x: 55, y: 8, w: 263, h: 396 },
    content: CHAPTER_CONTENTS[0],
  },
  {
    id: 'hardware',
    chapterNumber: 2,
    title: 'Hardware',
    titleTh: 'อุปกรณ์คอมพิวเตอร์',
    romaji: 'บทที่ 2 / CHAPTER 02',
    kanji: 'อุปกรณ์คอมพิวเตอร์',
    year: 1982,
    genre: 'Components',
    minutes: 50,
    synopsis:
      'ส่วนประกอบทางกายภาพของคอมพิวเตอร์ที่สัมผัสได้จริง เมนบอร์ด, CPU, RAM, การ์ดจอ GPU, ฮาร์ดดิสก์/SSD, พาวเวอร์ซัพพลาย และระบบระบายความร้อน ซึ่งเป็นตัวกำหนดประสิทธิภาพหลักของระบบ',
    accentColor: '#FF007F',
    spineCrop: { sheet: 'spines', x: 492, y: 31, w: 189, h: 1089 },
    coverCrop: { sheet: 'covers', x: 353, y: 8, w: 262, h: 396 },
    content: CHAPTER_CONTENTS[1],
  },
  {
    id: 'software',
    chapterNumber: 3,
    title: 'Software',
    titleTh: 'ซอฟต์แวร์คอมพิวเตอร์',
    romaji: 'บทที่ 3 / CHAPTER 03',
    kanji: 'ซอฟต์แวร์คอมพิวเตอร์',
    year: 1984,
    genre: 'Applications',
    minutes: 55,
    synopsis:
      'โปรแกรมหรือชุดคำสั่งควบคุมฮาร์ดแวร์ แบ่งเป็น 4 ประเภทหลัก: ซอฟต์แวร์ระบบ (System Software), ซอฟต์แวร์ประยุกต์ (Application Software), ซอฟต์แวร์อรรถประโยชน์ (Utility Software) และซอฟต์แวร์สำหรับเขียนโปรแกรม',
    accentColor: '#00E676',
    spineCrop: { sheet: 'fix', x: 197, y: 54, w: 324, h: 2566 },
    coverCrop: { sheet: 'covers', x: 642, y: 8, w: 260, h: 396 },
    content: CHAPTER_CONTENTS[2],
  },
  {
    id: 'os',
    chapterNumber: 4,
    title: 'Operating System',
    titleTh: 'ระบบปฏิบัติการ',
    romaji: 'บทที่ 4 / CHAPTER 04',
    kanji: 'ระบบปฏิบัติการ',
    year: 1985,
    genre: 'Systems',
    minutes: 60,
    synopsis:
      'ตัวกลางประสานระหว่างผู้ใช้ โปรแกรมประยุกต์ และฮาร์ดแวร์ จัดการ Process, Memory, File, Device, Security และ User Interface (GUI/CLI) เช่น Windows, macOS, Linux, Android และ iOS',
    accentColor: '#00B0FF',
    spineCrop: { sheet: 'spines', x: 937, y: 31, w: 188, h: 1089 },
    coverCrop: { sheet: 'covers', x: 938, y: 8, w: 261, h: 396 },
    content: CHAPTER_CONTENTS[3],
  },
  {
    id: 'cpu',
    chapterNumber: 5,
    title: 'CPU & Memory',
    titleTh: 'หน่วยประมวลผลและหน่วยความจำ',
    romaji: 'บทที่ 5 / CHAPTER 05',
    kanji: 'หน่วยประมวลผลและหน่วยความจำ',
    year: 1988,
    genre: 'Architecture',
    minutes: 52,
    synopsis:
      'สมองของคอมพิวเตอร์และคลังจัดเก็บข้อมูลชั่วคราว: โครงสร้าง Control Unit (CU), ALU, Registers, Clock Speed, Core/Thread ร่วมกับ RAM, ROM, Cache Memory และ Virtual Memory',
    accentColor: '#D500F9',
    spineCrop: { sheet: 'spines', x: 1157, y: 31, w: 185, h: 1090 },
    coverCrop: { sheet: 'covers', x: 55, y: 419, w: 263, h: 396 },
    content: CHAPTER_CONTENTS[4],
  },
  {
    id: 'storage',
    chapterNumber: 6,
    title: 'Storage',
    titleTh: 'หน่วยความจำสำรอง',
    romaji: 'บทที่ 6 / CHAPTER 06',
    kanji: 'หน่วยความจำสำรอง',
    year: 1990,
    genre: 'Storage',
    minutes: 48,
    synopsis:
      'อุปกรณ์จัดเก็บข้อมูลถาวร: HDD จานแม่เหล็ก, SSD ความเร็วสูง, USB Flash Drive, Memory Card และ Cloud Storage พร้อมศึกษาหน่วยวัดความจุ Bit, Byte, KB, MB, GB, TB และความต่างจาก RAM',
    accentColor: '#FFD600',
    spineCrop: { sheet: 'spines', x: 44, y: 32, w: 184, h: 1088 },
    coverCrop: { sheet: 'covers', x: 353, y: 419, w: 262, h: 396 },
    content: CHAPTER_CONTENTS[5],
  },
  {
    id: 'io',
    chapterNumber: 7,
    title: 'Input & Output',
    titleTh: 'การรับข้อมูลและการแสดงผล',
    romaji: 'บทที่ 7 / CHAPTER 07',
    kanji: 'การรับข้อมูลและการแสดงผล',
    year: 1992,
    genre: 'I/O Devices',
    minutes: 42,
    synopsis:
      'กระบวนการรับข้อมูล (Input) ผ่าน Keyboard, Mouse, Scanner, Mic, Webcam และการแสดงผลลัพธ์ (Output) ผ่าน Monitor, Printer, Speaker, Headphone และ Projector ทำงานประสานกันอย่างเป็นระบบ',
    accentColor: '#00E5FF',
    spineCrop: { sheet: 'fix2', x: 371, y: 15, w: 349, h: 2655 },
    coverCrop: { sheet: 'covers', x: 642, y: 419, w: 260, h: 396 },
    content: CHAPTER_CONTENTS[6],
  },
  {
    id: 'peripherals',
    chapterNumber: 8,
    title: 'Peripherals',
    titleTh: 'อุปกรณ์ต่อพ่วงคอมพิวเตอร์',
    romaji: 'บทที่ 8 / CHAPTER 08',
    kanji: 'อุปกรณ์ต่อพ่วงคอมพิวเตอร์',
    year: 1995,
    genre: 'Peripherals',
    minutes: 46,
    synopsis:
      'อุปกรณ์ภายนอกเสริมขีดความสามารถ: อุปกรณ์รับข้อมูล, แสดงผล, จัดเก็บข้อมูล และอุปกรณ์สื่อสาร พร้อมพอร์ตเชื่อมต่อมาตรฐาน USB, HDMI, DisplayPort, Bluetooth และ Wi-Fi',
    accentColor: '#FF007F',
    spineCrop: { sheet: 'spines', x: 1573, y: 31, w: 183, h: 1089 },
    coverCrop: { sheet: 'covers', x: 938, y: 419, w: 261, h: 396 },
    content: CHAPTER_CONTENTS[7],
  },
  {
    id: 'networking',
    chapterNumber: 9,
    title: 'Networking',
    titleTh: 'ระบบเครือข่ายคอมพิวเตอร์',
    romaji: 'บทที่ 9 / CHAPTER 09',
    kanji: 'ระบบเครือข่ายคอมพิวเตอร์',
    year: 1998,
    genre: 'Networking',
    minutes: 58,
    synopsis:
      'การเชื่อมต่อสื่อสารระหว่างคอมพิวเตอร์: เครือข่าย PAN, LAN, MAN, WAN, อุปกรณ์เครือข่าย Router, Switch, Modem, NIC, AP และโทโพโลยีการเชื่อมต่อ Bus, Star, Ring, Mesh',
    accentColor: '#2979FF',
    spineCrop: { sheet: 'fix2', x: 808, y: 15, w: 347, h: 2656 },
    coverCrop: { sheet: 'covers', x: 55, y: 830, w: 263, h: 396 },
    content: CHAPTER_CONTENTS[8],
  },
  {
    id: 'internet',
    chapterNumber: 10,
    title: 'Internet & Web',
    titleTh: 'อินเทอร์เน็ตและเว็บไซต์',
    romaji: 'บทที่ 10 / CHAPTER 10',
    kanji: 'อินเทอร์เน็ตและเว็บไซต์',
    year: 2000,
    genre: 'Web Tech',
    minutes: 62,
    synopsis:
      'โครงสร้างพื้นฐานระดับโลก: เปรียบเทียบ Internet กับ World Wide Web (WWW), องค์ประกอบ Web Browser, Website, Webpage, Server, URL, HTTP/HTTPS, ประโยชน์ และข้อควรระวังในการใช้งาน',
    accentColor: '#00E5FF',
    spineCrop: { sheet: 'spines', x: 2012, y: 31, w: 188, h: 1089 },
    coverCrop: { sheet: 'covers', x: 353, y: 830, w: 262, h: 396 },
    content: CHAPTER_CONTENTS[9],
  },
  {
    id: 'cybersecurity',
    chapterNumber: 11,
    title: 'Cybersecurity',
    titleTh: 'ความปลอดภัยทางไซเบอร์',
    romaji: 'บทที่ 11 / CHAPTER 11',
    kanji: 'ความปลอดภัยทางไซเบอร์',
    year: 2004,
    genre: 'Security',
    minutes: 65,
    synopsis:
      'การปกป้องระบบดิจิทัล: ทำความรู้จักภัยคุกคาม Virus, Malware, Trojan, Ransomware, Phishing, Spyware, DDoS, วิธีป้องกัน 7 ข้อ และสามเหลี่ยมความมั่นคงปลอดภัย CIA Triad (Confidentiality, Integrity, Availability)',
    accentColor: '#00E5FF',
    spineCrop: { sheet: 'spines', x: 2236, y: 31, w: 189, h: 1089 },
    coverCrop: { sheet: 'covers', x: 642, y: 830, w: 260, h: 396 },
    content: CHAPTER_CONTENTS[10],
  },
  {
    id: 'troubleshooting',
    chapterNumber: 12,
    title: 'Troubleshooting',
    titleTh: 'การตรวจสอบและแก้ไขปัญหาคอมพิวเตอร์เบื้องต้น',
    romaji: 'บทที่ 12 / CHAPTER 12',
    kanji: 'การตรวจสอบและแก้ไขปัญหาคอมพิวเตอร์',
    year: 2008,
    genre: 'Diagnostics',
    minutes: 54,
    synopsis:
      'การวินิจฉัยและแก้ปัญหาคอมพิวเตอร์: ปัญหา Hardware, Software, Network, Performance พร้อมวิธีแก้ 7 ปัญหายอดฮิต, 6 ขั้นตอนแก้ปัญหาอย่างเป็นระบบ และแนวทางบำรุงรักษาป้องกันปัญหาซ้ำ',
    accentColor: '#FFD600',
    spineCrop: { sheet: 'spines', x: 2462, y: 31, w: 188, h: 1089 },
    coverCrop: { sheet: 'covers', x: 938, y: 830, w: 261, h: 396 },
    content: CHAPTER_CONTENTS[11],
  },
];

export interface DecadeTab {
  id: string;
  label: string;
  filmIndex: number;
}

export const DECADE_TABS: DecadeTab[] = [
  { id: 'all', label: 'ALL / ทั้งหมด', filmIndex: 0 },
  { id: 'part1', label: 'PART 1', filmIndex: 0 },
  { id: 'part2', label: 'PART 2', filmIndex: 4 },
  { id: 'part3', label: 'PART 3', filmIndex: 8 },
  { id: 'part4', label: 'PART 4', filmIndex: 10 },
];

export function getTabIdForFilmIndex(index: number): string {
  if (index < 4) return 'part1';
  if (index < 8) return 'part2';
  if (index < 10) return 'part3';
  return 'part4';
}

export const INK_BLOBS = [
  { id: 1, cx: 150, cy: 330, delay: 0 },
  { id: 2, cx: 340, cy: 600, delay: 120 },
  { id: 3, cx: 250, cy: 120, delay: 220 },
  { id: 4, cx: 90, cy: 760, delay: 300 },
  { id: 5, cx: 400, cy: 250, delay: 360 },
  { id: 6, cx: 260, cy: 860, delay: 420 },
  { id: 7, cx: 230, cy: 470, delay: 180 },
];

export { CHAPTER_CONTENTS, getChapterContent };
export type { ChapterContent, CourseSection } from './course-content';

