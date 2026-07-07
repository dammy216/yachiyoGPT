"""aiortc の Opus エンコーダ設定を上書きするランタイムパッチ。

aiortc は OpusEncoder を `application: "voip"`（通話向け・帯域を絞って
明瞭さを優先するプロファイル）に固定でハードコードしている
（aiortc/codecs/opus.py）。ヤチヨの声は通話ではなく音楽的な音声合成の
出力なので、フル帯域を活かす `"audio"` プロファイルに変えた方が
こもりにくく自然に聞こえる。

aiortc のソース自体は .venv 内（バージョン更新で上書きされる）なので、
直接編集せずクラスの __init__ をランタイムでパッチする。
main.py の起動時に import すること（副作用でパッチが適用される）。
"""

from aiortc.codecs import opus as aiortc_opus

_original_init = aiortc_opus.OpusEncoder.__init__


def _patched_init(self) -> None:
    _original_init(self)
    self.codec.options = {"application": "audio"}


aiortc_opus.OpusEncoder.__init__ = _patched_init
