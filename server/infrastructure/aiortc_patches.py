"""aiortc の Opus エンコーダ設定を上書きするランタイムパッチ。

aiortc は OpusEncoder を `application: "voip"`（通話向け・帯域を絞って
明瞭さを優先するプロファイル）、`bit_rate: 96000` に固定でハードコード
している（aiortc/codecs/opus.py）。ヤチヨの声は通話ではなく音楽的な音声
合成の出力なので、フル帯域を活かす `"audio"` プロファイルに変えた方が
こもりにくく自然に聞こえる。

ただし `"audio"`（CELT/MDCT）は `"voip"`（SILK/Hybrid）と違い、十分な
ビットレートを与えないと逆に高域が削られてこもって聞こえる特性がある。
`application` だけ変えて `bit_rate` を通話向けの96kbpsのままにしていた
ところ改善しなかったため、ビットレートも合わせて引き上げる。

aiortc のソース自体は .venv 内（バージョン更新で上書きされる）なので、
直接編集せずクラスの __init__ をランタイムでパッチする。
main.py の起動時に import すること（副作用でパッチが適用される）。
"""

from aiortc.codecs import opus as aiortc_opus

_original_init = aiortc_opus.OpusEncoder.__init__


def _patched_init(self) -> None:
    _original_init(self)
    self.codec.options = {"application": "audio"}
    self.codec.bit_rate = 192000


aiortc_opus.OpusEncoder.__init__ = _patched_init
