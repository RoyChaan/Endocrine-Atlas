#!/usr/bin/env bash
# 把第三方 3D 生成器（Tripo）导出的高模压到能进浏览器的尺寸。
#
#   源  Organ/新建文件夹/*.glb   每个 ~200 万面 / ~57 MB
#   出  public/models/<id>.glb   每个 ~4 万面 / ~1 MB
#
# 为什么要循环调用 simplify 而不是一次给足 --ratio：
# meshoptimizer 的简化器每次调用只能折叠到某个拓扑下限就停（属性缝、
# 边界会锁住一批边），一次 --ratio 0.02 实测只掉到 5%，再跑一次才继续掉。
# 所以这里反复跑到面数达标为止，而不是相信单次的 ratio。
#
# --error 1 是把误差预算放到最大，让 ratio 成为唯一约束。腺体在人体里
# 只有几厘米大，几何误差在这个尺度上看不出来；真正要保住的是外形轮廓，
# 而简化器本来就是优先保轮廓的。
#
# 最后 quantize：顶点属性从 float32 降到 int16/int8（KHR_mesh_quantization，
# three 的 GLTFLoader 原生支持，不需要额外解码器）。文件再小一半左右。
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="Organ/新建文件夹"
OUT="public/models"
GT="node_modules/.bin/gltf-transform"
TARGET_TRIS=45000
MAX_PASSES=8

mkdir -p "$OUT"

tris() {
  node -e '
    const fs=require("fs");
    const b=fs.readFileSync(process.argv[1]);
    const j=JSON.parse(b.slice(20,20+b.readUInt32LE(12)).toString());
    let t=0; for(const m of j.meshes||[]) for(const p of m.primitives) t+=j.accessors[p.indices].count/3;
    console.log(Math.round(t));
  ' "$1"
}

convert() {
  local src="$1" id="$2"
  local cur="/tmp/$id.0.glb"
  cp "$SRC/$src" "$cur"

  for ((pass=1; pass<=MAX_PASSES; pass++)); do
    local n; n=$(tris "$cur")
    if (( n <= TARGET_TRIS )); then break; fi
    local ratio; ratio=$(node -e "console.log(Math.max(0.02, $TARGET_TRIS/$n).toFixed(4))")
    local next="/tmp/$id.$pass.glb"
    "$GT" simplify "$cur" "$next" --ratio "$ratio" --error 1 >/dev/null
    rm -f "$cur"; cur="$next"
  done

  "$GT" prune "$cur" "/tmp/$id.pruned.glb" >/dev/null
  "$GT" quantize "/tmp/$id.pruned.glb" "$OUT/$id.glb" >/dev/null
  rm -f "$cur" "/tmp/$id.pruned.glb"
  printf '%-14s %7s tris  %s\n' "$id" "$(tris "$OUT/$id.glb")" "$(du -h "$OUT/$id.glb" | cut -f1)"
}

convert "brain+3d+model.glb"                    brain
convert "anatomical+thyroid+model.glb"          thyroid
convert "Thymus+3d+model.glb"                   thymus
convert "kidneys+vascular+system+3d+model.glb"  adrenal
convert "pancreas+3d+model.glb"                 pancreas
convert "uterus+3d+model.glb"                   ovary
convert "testis+3d+model.glb"                   testis
