export type Vec3 = readonly [number, number, number]

export type GlandId =
  | 'pituitary'
  | 'thyroid'
  | 'thymus'
  | 'adrenal'
  | 'pancreas'
  | 'ovary'
  | 'testis'

/**
 * 腺体在哪里展示。
 *
 * - `'body'`   —— 作为模型嵌在半透明人体内
 * - `'detail'` —— 不在人体内，由一个独立的详情视图单独承载
 *
 * 睾丸是 `'detail'`：卵巢与睾丸在解剖学上互斥，同一具人体不可能两者兼有。
 * 人体上放的是卵巢，睾丸单独展示，可进可退。
 */
export type GlandDisplay = 'body' | 'detail'

/**
 * 一个腺体对应的外部 3D 模型，以及它该怎么摆进人体。
 *
 * 模型全部来自第三方 3D 生成器，经 `scripts/build-organs.sh` 减面后放在
 * `public/models/`。生成器的输出有一个共同约定：**模型被归一化过** ——
 * 最长边约 1、底面贴在 y = 0、水平方向居中。所以摆放不能靠模型自带的
 * 坐标，必须在运行时量一遍它的包围盒，再按下面三项重新落位。
 */
export interface OrganModel {
  /** `public/` 下的路径，如 `/models/thyroid.glb`。 */
  readonly url: string
  /**
   * 缩放后模型**最长边**的实际长度（米）。
   * 用最长边而不是某个具体轴，是因为各个模型的朝向不一致，
   * 唯一稳定可比的量就是"这个器官整体有多大"。
   */
  readonly size: number
  /** 模型包围盒中心落在人体坐标系的哪个点。 */
  readonly anchor: Vec3
  /**
   * 绕 +Y 轴的偏航（弧度），在缩放与落位之前施加。
   *
   * 七个模型里只有大脑需要：生成器把它的前后轴放在了 X 上（前额朝 −X），
   * 而人体坐标系里腹侧是 +Z。其余六个导出时就是 +Y 朝上、+Z 朝腹侧。
   */
  readonly yaw?: number
  /**
   * 沿人体左右轴（世界 X）的额外压缩，在 `yaw` **之后**施加。默认 1（不压）。
   *
   * 这是唯一一处允许非等比缩放的地方，只为修生成器给错的比例：大脑那个模型
   * 的半脑宽长比是 0.57，而真实半脑约 0.41 —— 厚了四成。整体缩小能塞进颅腔，
   * 但前后径会跟着从 17 cm 缩到 12 cm，那就不是脑的样子了。压左右轴才是
   * 对症的：前后径保住，宽度回到解剖值。
   */
  readonly lateralScale?: number
}

export interface Gland {
  readonly id: GlandId
  /** 英文名，知识卡的次级标签。 */
  readonly name: string
  /** 中文名，知识卡主标题。 */
  readonly chineseName: string
  /** 3D 模型与它在人体里的落位。 */
  readonly model: OrganModel
  /** 嵌在人体内，还是由独立详情视图承载。 */
  readonly display: GlandDisplay
  /**
   * 相机注视点相对 `model.anchor` 的偏移。
   *
   * 有些模型里"腺体本身"不在包围盒中心：肾上腺只是那对肾脏顶端的小帽子，
   * 胸腺的主体偏上。聚焦要对准腺体，不是对准整个模型。
   */
  readonly focusOffset?: Vec3
  /** 一句话位置描述。 */
  readonly location: string
  /**
   * "有什么功能" 的正文，1–3 条。文字照初中生物教材给，不自行改写
   * （Design.md §16）—— 这张卡是拿来对着课本背的，措辞得和课本一致。
   */
  readonly functions: readonly string[]
  /** 主题色，用于知识卡与选中高亮。 */
  readonly color: string
  /** 相机聚焦时与腺体的距离，用于保留周边解剖上下文（Design.md §10）。 */
  readonly focusDistance: number
}

export interface CameraPose {
  readonly position: Vec3
  readonly target: Vec3
}
