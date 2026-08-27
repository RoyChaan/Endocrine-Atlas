import type { Gland } from '../types/gland'

/**
 * 全部教育内容的唯一真源（Design.md §15）。
 * UI 组件不得直接引用本文件，一律经由 domain/glandRegistry.ts。
 *
 * 坐标系（Design.md §29）：+Y 上，+X 人体左侧，+Z 腹侧；原点在双脚间地面，总高 1.75。
 * 数组顺序按解剖高度从上到下排列，tests/data.test.ts 会校验这一顺序。
 */
export const GLANDS: readonly Gland[] = [
  {
    id: 'hypothalamus',
    name: 'Hypothalamus',
    chineseName: '下丘脑',
    positions: [[0, 1.655, -0.01]],
    hasInset: false,
    location: '大脑底部，垂体的正上方',
    hormones: ['释放激素'],
    functions: ['指挥垂体工作，是内分泌系统的“总开关”', '调节体温、饥饿和睡眠'],
    color: '#7C9EF0',
    focusDistance: 0.45,
  },
  {
    id: 'pituitary',
    name: 'Pituitary',
    chineseName: '垂体',
    positions: [[0, 1.63, -0.01]],
    hasInset: false,
    location: '大脑底部，约一颗豌豆大小',
    hormones: ['生长激素'],
    functions: ['促进身体长高、长壮', '指挥其他内分泌腺工作'],
    color: '#9B8CF0',
    focusDistance: 0.45,
  },
  {
    id: 'thyroid',
    name: 'Thyroid',
    chineseName: '甲状腺',
    positions: [[0, 1.47, 0.05]],
    hasInset: false,
    location: '颈部前方，气管两侧',
    hormones: ['甲状腺激素'],
    functions: ['调节身体的新陈代谢', '参与生长发育', '影响神经系统的兴奋性'],
    color: '#F0968C',
    focusDistance: 0.5,
  },
  {
    id: 'adrenal',
    name: 'Adrenal Glands',
    chineseName: '肾上腺',
    positions: [
      [-0.06, 1.13, -0.06],
      [0.06, 1.13, -0.06],
    ],
    hasInset: false,
    location: '左右两个肾脏的上方，各一个',
    hormones: ['肾上腺素'],
    functions: ['紧张或危险时让心跳加快、呼吸加深', '帮助身体应对压力'],
    color: '#F0C46A',
    focusDistance: 0.55,
  },
  {
    id: 'pancreas',
    name: 'Pancreas',
    chineseName: '胰腺',
    positions: [[0, 1.08, -0.02]],
    hasInset: false,
    location: '上腹部，胃的后下方',
    hormones: ['胰岛素'],
    functions: ['降低血糖，调节糖类的代谢', '分泌不足会引起糖尿病'],
    color: '#7FD1A8',
    focusDistance: 0.55,
  },
  {
    id: 'ovary',
    name: 'Ovaries',
    chineseName: '卵巢',
    positions: [
      [-0.05, 0.93, -0.01],
      [0.05, 0.93, -0.01],
    ],
    hasInset: false,
    location: '女性下腹部盆腔内，左右各一',
    hormones: ['雌性激素'],
    functions: ['促进女性生殖器官的发育', '激发并维持女性的第二性征'],
    color: '#E68FC0',
    focusDistance: 0.5,
  },
  {
    id: 'testis',
    name: 'Testes',
    chineseName: '睾丸',
    positions: [
      [-0.025, 0.84, 0.05],
      [0.025, 0.84, 0.05],
    ],
    // 睾丸在半透明 mannequin 的盆腔下方不易看清，额外给一个细节小窗。
    hasInset: true,
    location: '男性阴囊内，左右各一',
    hormones: ['雄性激素'],
    functions: ['促进男性生殖器官的发育', '激发并维持男性的第二性征'],
    color: '#6FC3D9',
    focusDistance: 0.45,
  },
]
