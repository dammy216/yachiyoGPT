-- CharacterAnimation: ヤチヨベースのヒエラルキー制御スクリプト
-- 機能: ① 呼吸する処理   ② カーソルを目が追う処理
--
-- ※ ベースアートボード(0-12223)の "PointerHitArea" シェイプ(0-43545)に
--   アタッチして使用する。これは (0,0)〜(1024,1024) を覆う実質透明
--   (alpha=1/255) の矩形で、どこにカーソルがあっても pointerMove が届く。
--   ViewModel "CharacterAnim" がアートボードにバインドされ、20個の
--   Number プロパティが各パーツの X/Y にデータバインドされている前提。

type CharacterAnimation = {
    -- 目パーツ (eyes グループ相対のローカル X/Y)
    vmIrisRX: Property<number>?,
    vmIrisRY: Property<number>?,
    vmIrisLX: Property<number>?,
    vmIrisLY: Property<number>?,
    vmEyelashRX: Property<number>?,
    vmEyelashRY: Property<number>?,
    vmEyelashLX: Property<number>?,
    vmEyelashLY: Property<number>?,
    vmEyewhiteRX: Property<number>?,
    vmEyewhiteRY: Property<number>?,
    vmEyewhiteLX: Property<number>?,
    vmEyewhiteLY: Property<number>?,
    vmEyebrowRX: Property<number>?,
    vmEyebrowRY: Property<number>?,
    vmEyebrowLX: Property<number>?,
    vmEyebrowLY: Property<number>?,
    -- 呼吸で上下させるボディパーツの Y
    vmFaceY: Property<number>?,
    vmNeckY: Property<number>?,
    vmTopwearY: Property<number>?,
    vmBackHairY: Property<number>?,
    -- 入力・内部状態
    mouseX: number,
    mouseY: number,
    breathTime: number,
    eyeOffsetX: number,
    eyeOffsetY: number,
}

-- 目パーツの基準ローカル座標 (eyes グループ相対)
local IRIS_RX, IRIS_RY  = -51.0,  7.0
local IRIS_LX, IRIS_LY  =  52.0,  3.0
local LASH_RX, LASH_RY  = -57.0,  1.5
local LASH_LX, LASH_LY  =  56.5, -2.5
local WHIT_RX, WHIT_RY  = -53.0,  7.0
local WHIT_LX, WHIT_LY  =  52.0,  2.0
local BROW_RX, BROW_RY  = -49.0,  1.0
local BROW_LX, BROW_LY  =  51.5, -2.5

-- 呼吸で動かすボディパーツの基準 Y
local BASE_FACE_Y  = 494.0
local BASE_BHAIR_Y = 494.0
local BASE_NECK_Y  = -256.5
local BASE_TOP_Y   = 52.0

-- eyes グループのアートボード座標: face(512,494) + eyes(-7,-210) = (505, 284)
local EYE_WORLD_X = 505.0
local EYE_WORLD_Y = 284.0

-- 目追従パラメータ
local EYE_MAX_OFFSET = 7.0    -- 瞳が動ける最大ピクセル量
local EYE_REACH      = 180.0  -- この距離で追従量が最大(=±1)になる
local EYE_LERP_SPEED = 5.0    -- 追従の滑らかさ(高いほど俊敏)

-- 呼吸パラメータ
local BREATH_AMP   = 5.0      -- 上下の振幅(Riveユニット)
local BREATH_SPEED = 0.25     -- 1秒あたりの呼吸サイクル数 (0.25 = 約15回/分)

-- カーソル位置から瞳のオフセット(目標値)を計算する
local function eyeOffset(mx: number, my: number): (number, number)
    local dx = mx - EYE_WORLD_X
    local dy = my - EYE_WORLD_Y
    local dist = math.sqrt(dx * dx + dy * dy)
    if dist < 0.001 then return 0, 0 end
    local t = math.min(dist / EYE_REACH, 1.0)
    return (dx / dist) * t * EYE_MAX_OFFSET,
           (dy / dist) * t * EYE_MAX_OFFSET
end

function init(self: CharacterAnimation, context: Context): boolean
    local vm = context:viewModel()
    if not vm then
        print("[CharacterAnimation] ViewModelなし")
        return false
    end
    self.vmIrisRX     = vm:getNumber("irisRX")
    self.vmIrisRY     = vm:getNumber("irisRY")
    self.vmIrisLX     = vm:getNumber("irisLX")
    self.vmIrisLY     = vm:getNumber("irisLY")
    self.vmEyelashRX  = vm:getNumber("eyelashRX")
    self.vmEyelashRY  = vm:getNumber("eyelashRY")
    self.vmEyelashLX  = vm:getNumber("eyelashLX")
    self.vmEyelashLY  = vm:getNumber("eyelashLY")
    self.vmEyewhiteRX = vm:getNumber("eyewhiteRX")
    self.vmEyewhiteRY = vm:getNumber("eyewhiteRY")
    self.vmEyewhiteLX = vm:getNumber("eyewhiteLX")
    self.vmEyewhiteLY = vm:getNumber("eyewhiteLY")
    self.vmEyebrowRX  = vm:getNumber("eyebrowRX")
    self.vmEyebrowRY  = vm:getNumber("eyebrowRY")
    self.vmEyebrowLX  = vm:getNumber("eyebrowLX")
    self.vmEyebrowLY  = vm:getNumber("eyebrowLY")
    self.vmFaceY      = vm:getNumber("faceY")
    self.vmNeckY      = vm:getNumber("neckY")
    self.vmTopwearY   = vm:getNumber("topwearY")
    self.vmBackHairY  = vm:getNumber("backHairY")

    print("[CharacterAnimation] 初期化完了")
    return true
end

function advance(self: CharacterAnimation, seconds: number): boolean
    -- ===== ① 呼吸する処理 =====
    self.breathTime += seconds
    -- 正弦波: 上方向(-Y)がピーク
    local breathY = -math.sin(self.breathTime * math.tau * BREATH_SPEED) * BREATH_AMP
    if self.vmFaceY     then self.vmFaceY.value     = BASE_FACE_Y  + breathY       end
    if self.vmBackHairY then self.vmBackHairY.value = BASE_BHAIR_Y + breathY * 0.6 end
    if self.vmNeckY     then self.vmNeckY.value     = BASE_NECK_Y  + breathY       end
    if self.vmTopwearY  then self.vmTopwearY.value  = BASE_TOP_Y   + breathY       end

    -- ===== ② カーソルを目が追う処理 =====
    local tx, ty = eyeOffset(self.mouseX, self.mouseY)
    -- 目標オフセットへ滑らかに補間 (フレームレート非依存)
    local a = math.min(EYE_LERP_SPEED * seconds, 1.0)
    self.eyeOffsetX += (tx - self.eyeOffsetX) * a
    self.eyeOffsetY += (ty - self.eyeOffsetY) * a
    local ox = self.eyeOffsetX
    local oy = self.eyeOffsetY

    -- パーツごとに追従量を変えて奥行き感を出す (虹彩が最も動く)
    if self.vmIrisRX     then self.vmIrisRX.value     = IRIS_RX + ox        end
    if self.vmIrisRY     then self.vmIrisRY.value     = IRIS_RY + oy        end
    if self.vmIrisLX     then self.vmIrisLX.value     = IRIS_LX + ox        end
    if self.vmIrisLY     then self.vmIrisLY.value     = IRIS_LY + oy        end
    if self.vmEyelashRX  then self.vmEyelashRX.value  = LASH_RX + ox * 0.6  end
    if self.vmEyelashRY  then self.vmEyelashRY.value  = LASH_RY + oy * 0.4  end
    if self.vmEyelashLX  then self.vmEyelashLX.value  = LASH_LX + ox * 0.6  end
    if self.vmEyelashLY  then self.vmEyelashLY.value  = LASH_LY + oy * 0.4  end
    if self.vmEyewhiteRX then self.vmEyewhiteRX.value = WHIT_RX + ox * 0.2  end
    if self.vmEyewhiteRY then self.vmEyewhiteRY.value = WHIT_RY + oy * 0.2  end
    if self.vmEyewhiteLX then self.vmEyewhiteLX.value = WHIT_LX + ox * 0.2  end
    if self.vmEyewhiteLY then self.vmEyewhiteLY.value = WHIT_LY + oy * 0.2  end
    if self.vmEyebrowRX  then self.vmEyebrowRX.value  = BROW_RX + ox * 0.15 end
    if self.vmEyebrowRY  then self.vmEyebrowRY.value  = BROW_RY + oy * 0.1  end
    if self.vmEyebrowLX  then self.vmEyebrowLX.value  = BROW_LX + ox * 0.15 end
    if self.vmEyebrowLY  then self.vmEyebrowLY.value  = BROW_LY + oy * 0.1  end

    return true
end

function update(self: CharacterAnimation) end

function pointerMove(self: CharacterAnimation, event: PointerEvent)
    self.mouseX = event.position.x
    self.mouseY = event.position.y
    event:hit()
end

function pointerDown(self: CharacterAnimation, event: PointerEvent)
    self.mouseX = event.position.x
    self.mouseY = event.position.y
    event:hit()
end

return function(): Node<CharacterAnimation>
    return {
        init = init,
        advance = advance,
        update = update,
        pointerMove = pointerMove,
        pointerDown = pointerDown,
        vmIrisRX = nil, vmIrisRY = nil,
        vmIrisLX = nil, vmIrisLY = nil,
        vmEyelashRX = nil, vmEyelashRY = nil,
        vmEyelashLX = nil, vmEyelashLY = nil,
        vmEyewhiteRX = nil, vmEyewhiteRY = nil,
        vmEyewhiteLX = nil, vmEyewhiteLY = nil,
        vmEyebrowRX = nil, vmEyebrowRY = nil,
        vmEyebrowLX = nil, vmEyebrowLY = nil,
        vmFaceY = nil, vmNeckY = nil,
        vmTopwearY = nil, vmBackHairY = nil,
        -- カーソル初期値は目の中心に置き、起動直後の正面向きを維持
        mouseX = EYE_WORLD_X, mouseY = EYE_WORLD_Y,
        breathTime = 0,
        eyeOffsetX = 0, eyeOffsetY = 0,
    }
end
