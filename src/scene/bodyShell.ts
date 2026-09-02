import { Color, DoubleSide, ShaderMaterial } from 'three'

/**
 * 人体外壳的菲涅尔材质。
 *
 * 为什么不用 `meshStandardMaterial` + 低 opacity：
 *
 * 均匀半透明的壳有两个治不好的毛病。一是正对视线的大片区域和掠射的边缘
 * 一样浓，读不出体积，看起来像一张贴纸；二是躯干与四肢在肩、髋处必然
 * 相交，每条相交线两侧的叠加层数不同，于是**每条内部边界都显出一道亮线**
 * —— 这正是 brief §3.4 说的半透明人体最大的技术风险。
 *
 * 菲涅尔壳把不透明度挂到视线与法线的夹角上：正对视线 → 几乎全透，
 * 掠射 → 亮起。于是
 *
 * - 内部那些正对视线的交叠面自身就接近不可见，亮线问题从源头消失；
 * - 剩下发亮的恰好是**外轮廓**，人体读起来是一层玻璃，而不是一块毛玻璃板；
 * - 体内的腺体在正对区域几乎不被遮挡，可读性反而比均匀半透明更好。
 *
 * `depthWrite: false` 保留，理由与占位实现相同：让体内的腺体透出来。
 * `DoubleSide` 在这里是安全的 —— 背面同样走菲涅尔，不会糊成一片。
 */
export function createBodyShellMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      // Color 构造会把 sRGB 转进 three 的线性工作空间，直接写字面量会偏亮。
      uCore: { value: new Color('#7FB6CE') },
      uRim: { value: new Color('#CDE9F5') },
      /** 菲涅尔的锐度。越大，亮边越窄越集中在轮廓上。 */
      uPower: { value: 2.4 },
      /** 正对视线时的底不透明度。给一点，人体才不至于完全消失。 */
      uBase: { value: 0.05 },
      /** 轮廓处额外叠加的不透明度。 */
      uEdge: { value: 0.5 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vViewDir;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        // 人体不做非均匀缩放，直接用 modelMatrix 的线性部分即可，
        // 不需要法线矩阵。
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCore;
      uniform vec3 uRim;
      uniform float uPower;
      uniform float uBase;
      uniform float uEdge;

      varying vec3 vNormalW;
      varying vec3 vViewDir;

      void main() {
        vec3 n = normalize(vNormalW);
        // 背面的法线朝里，翻回来，否则背面的菲涅尔是反的。
        if (!gl_FrontFacing) {
          n = -n;
        }
        float facing = abs(dot(n, normalize(vViewDir)));
        float rim = pow(clamp(1.0 - facing, 0.0, 1.0), uPower);

        vec3 color = mix(uCore, uRim, rim);
        float alpha = uBase + uEdge * rim;

        gl_FragColor = vec4(color, alpha);

        #include <colorspace_fragment>
      }
    `,
  })
}
