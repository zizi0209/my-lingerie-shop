export interface SizeInfo {
  size: string;
  bust?: string;
  underBust?: string;
  cup?: string;
  waist?: string;
  hips?: string;
  height?: string;
  weight?: string;
}

export interface MeasurementStep {
  name: string;
  description: string;
}

export interface SizeChartData {
  categoryName: string;
  headers: string[];
  sizes: SizeInfo[];
  measurements: MeasurementStep[];
  tips: string[];
}

export const SIZE_CHARTS: Record<string, SizeChartData> = {
  // Áo lót
  "ao-lot": {
    categoryName: "Áo Lót",
    headers: ["Size", "Vòng ngực trên", "Vòng ngực dưới", "Cup"],
    sizes: [
      { size: "70A", bust: "78-80 cm", underBust: "68-72 cm", cup: "A" },
      { size: "70B", bust: "80-82 cm", underBust: "68-72 cm", cup: "B" },
      { size: "70C", bust: "82-84 cm", underBust: "68-72 cm", cup: "C" },
      { size: "75A", bust: "83-85 cm", underBust: "73-77 cm", cup: "A" },
      { size: "75B", bust: "85-87 cm", underBust: "73-77 cm", cup: "B" },
      { size: "75C", bust: "87-89 cm", underBust: "73-77 cm", cup: "C" },
      { size: "80A", bust: "88-90 cm", underBust: "78-82 cm", cup: "A" },
      { size: "80B", bust: "90-92 cm", underBust: "78-82 cm", cup: "B" },
      { size: "80C", bust: "92-94 cm", underBust: "78-82 cm", cup: "C" },
      { size: "85B", bust: "95-97 cm", underBust: "83-87 cm", cup: "B" },
      { size: "85C", bust: "97-99 cm", underBust: "83-87 cm", cup: "C" },
      { size: "85D", bust: "99-101 cm", underBust: "83-87 cm", cup: "D" },
    ],
    measurements: [
      {
        name: "Vòng ngực trên",
        description: "Đo ngang qua điểm cao nhất của ngực. Giữ thước dây song song với mặt đất, không siết quá chặt.",
      },
      {
        name: "Vòng ngực dưới",
        description: "Đo sát phía dưới ngực, vòng quanh lưng. Thước dây nên ôm sát nhưng thoải mái.",
      },
      {
        name: "Xác định Cup",
        description: "Cup = Vòng ngực trên - Vòng ngực dưới. Chênh lệch 10cm = A, 12.5cm = B, 15cm = C, 17.5cm = D.",
      },
    ],
    tips: [
      "Đo khi không mặc áo lót hoặc mặc áo lót không đệm",
      "Nếu phân vân giữa 2 size, chọn size lớn hơn",
      "Dây áo không nên để lỏng quá hoặc chặt quá",
    ],
  },

  // Quần lót
  "quan-lot": {
    categoryName: "Quần Lót",
    headers: ["Size", "Vòng mông", "Vòng eo"],
    sizes: [
      { size: "S", hips: "86-90 cm", waist: "62-66 cm" },
      { size: "M", hips: "90-94 cm", waist: "66-70 cm" },
      { size: "L", hips: "94-98 cm", waist: "70-74 cm" },
      { size: "XL", hips: "98-102 cm", waist: "74-78 cm" },
      { size: "XXL", hips: "102-106 cm", waist: "78-82 cm" },
    ],
    measurements: [
      {
        name: "Vòng mông",
        description: "Đo ngang qua điểm nở nhất của mông. Đứng thẳng, hai chân khép lại.",
      },
      {
        name: "Vòng eo",
        description: "Đo ngang qua điểm nhỏ nhất của eo (thường trên rốn 2-3cm).",
      },
    ],
    tips: [
      "Chọn size dựa trên vòng mông là chính xác nhất",
      "Quần lót cotton nên chọn vừa, không quá chật",
      "Quần ren/lace có thể chọn size nhỏ hơn vì co giãn tốt",
    ],
  },

  // Đồ ngủ / Bodysuit / Set
  "do-ngu": {
    categoryName: "Đồ Ngủ & Bodysuit",
    headers: ["Size", "Chiều cao", "Cân nặng", "Vòng ngực", "Vòng eo"],
    sizes: [
      { size: "S", height: "150-158 cm", weight: "42-48 kg", bust: "78-84 cm", waist: "62-66 cm" },
      { size: "M", height: "158-165 cm", weight: "48-54 kg", bust: "84-90 cm", waist: "66-70 cm" },
      { size: "L", height: "165-170 cm", weight: "54-60 kg", bust: "90-96 cm", waist: "70-74 cm" },
      { size: "XL", height: "170-175 cm", weight: "60-68 kg", bust: "96-102 cm", waist: "74-78 cm" },
    ],
    measurements: [
      {
        name: "Chiều cao",
        description: "Đo từ đỉnh đầu đến gót chân, đứng thẳng không đi giày.",
      },
      {
        name: "Vòng ngực",
        description: "Đo ngang qua điểm cao nhất của ngực.",
      },
      {
        name: "Vòng eo",
        description: "Đo ngang qua điểm nhỏ nhất của eo.",
      },
    ],
    tips: [
      "Đồ ngủ nên chọn thoải mái, không quá ôm sát",
      "Bodysuit nên chọn đúng size hoặc nhỏ hơn 1 size nếu thích ôm",
      "Xem kỹ chất liệu: Satin ít co giãn, Cotton co giãn vừa",
    ],
  },

  // Set đồ lót
  "set-do-lot": {
    categoryName: "Set Đồ Lót",
    headers: ["Size", "Vòng ngực trên", "Vòng ngực dưới", "Vòng mông"],
    sizes: [
      { size: "S", bust: "78-84 cm", underBust: "68-72 cm", hips: "86-90 cm" },
      { size: "M", bust: "84-90 cm", underBust: "73-77 cm", hips: "90-94 cm" },
      { size: "L", bust: "90-96 cm", underBust: "78-82 cm", hips: "94-98 cm" },
      { size: "XL", bust: "96-102 cm", underBust: "83-87 cm", hips: "98-102 cm" },
    ],
    measurements: [
      {
        name: "Vòng ngực trên",
        description: "Đo ngang qua điểm cao nhất của ngực.",
      },
      {
        name: "Vòng ngực dưới",
        description: "Đo sát phía dưới ngực, vòng quanh lưng.",
      },
      {
        name: "Vòng mông",
        description: "Đo ngang qua điểm nở nhất của mông.",
      },
    ],
    tips: [
      "Set thường bán theo size chung (S/M/L), ưu tiên chọn theo vòng ngực",
      "Nếu áo và quần khác size, liên hệ shop để mua riêng",
    ],
  },

  // Default fallback
  default: {
    categoryName: "Nội Y",
    headers: ["Size", "Vòng ngực", "Vòng eo", "Vòng mông"],
    sizes: [
      { size: "S", bust: "78-84 cm", waist: "62-66 cm", hips: "86-90 cm" },
      { size: "M", bust: "84-90 cm", waist: "66-70 cm", hips: "90-94 cm" },
      { size: "L", bust: "90-96 cm", waist: "70-74 cm", hips: "94-98 cm" },
      { size: "XL", bust: "96-102 cm", waist: "74-78 cm", hips: "98-102 cm" },
    ],
    measurements: [
      {
        name: "Vòng ngực",
        description: "Đo ngang qua điểm cao nhất của ngực.",
      },
      {
        name: "Vòng eo",
        description: "Đo ngang qua điểm nhỏ nhất của eo.",
      },
      {
        name: "Vòng mông",
        description: "Đo ngang qua điểm nở nhất của mông.",
      },
    ],
    tips: [
      "Nếu phân vân giữa 2 size, nên chọn size lớn hơn",
      "Kiểm tra chính sách đổi size của shop trước khi mua",
    ],
  },
};

// Map category slug to size chart key
export const getCategoryChartKey = (categorySlug: string): string => {
  const mapping: Record<string, string> = {
    "ao-lot": "ao-lot",
    "ao-nguc": "ao-lot",
    "bra": "ao-lot",
    "quan-lot": "quan-lot",
    "panties": "quan-lot",
    "do-ngu": "do-ngu",
    "vay-ngu": "do-ngu",
    "bodysuit": "do-ngu",
    "set-do-lot": "set-do-lot",
    "bo-do-lot": "set-do-lot",
  };

  // Check direct mapping
  if (mapping[categorySlug]) {
    return mapping[categorySlug];
  }

  // Check partial match
  for (const [key, value] of Object.entries(mapping)) {
    if (categorySlug.includes(key) || key.includes(categorySlug)) {
      return value;
    }
  }

  return "default";
};
