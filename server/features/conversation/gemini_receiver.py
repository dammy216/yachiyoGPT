"""slice: conversation — Gemini Live からの応答を受信する（1 接続ぶん）。

Gemini の音声は破棄し、output_transcription（読み上げテキスト）を
TurnAudioPipeline に逐次流し込む。ターン完了（turn_complete）を待たず、
文が確定するたびに Fish Audio TTS を先行して開始できるようにするため。
接続が閉じたら最新の session_resumption ハンドルを返し、
呼び出し元（session_runner）が再接続に使う。
"""

import asyncio

import websockets

from features.voice_response.synthesizer import TurnAudioPipeline
from infrastructure.session_store import store


async def receive_from_gemini(session, sid: str, handle):
    state = store.get(sid)
    pipeline = TurnAudioPipeline(state)
    try:
        async for response in session.receive():
            # 再接続用ハンドルを更新
            sru = getattr(response, "session_resumption_update", None)
            if sru and sru.resumable and sru.new_handle:
                handle = sru.new_handle
            # 切断予告（この後で接続が閉じるが、session_runner が再接続する）
            ga = getattr(response, "go_away", None)
            if ga:
                print(f"\n[receive] {sid} GoAway time_left={getattr(ga, 'time_left', None)}")

            sc = getattr(response, "server_content", None)
            if not sc:
                continue
            # ユーザーの割り込み（バージイン）: 再生中の音声を即座に止める
            if getattr(sc, "interrupted", False):
                print(f"\n[receive] {sid} interrupted: 割り込みを検知")
                if state:
                    state.text_buffer = ""
                    if state.synth_task and not state.synth_task.done():
                        state.synth_task.cancel()
                pipeline.cancel()
                pipeline = TurnAudioPipeline(state)
                if state and state.tts_track:
                    state.tts_track.flush()
                # interrupted と同じメッセージに乗ってくる output_transcription は
                # 割り込まれた直前ターンの残りテキストであり、次のターンの発言では
                # ない。ここで処理すると新しい pipeline に古い回答の続きが混入し、
                # 割り込み直後にヤチヨが前の回答を繰り返す原因になるため捨てる。
                continue
            ot = getattr(sc, "output_transcription", None)
            if ot and ot.text:
                print(ot.text, end="")
                if state:
                    state.text_buffer += ot.text
                pipeline.feed(ot.text)
            if getattr(sc, "turn_complete", False):
                text = ""
                if state:
                    text = state.text_buffer.strip()
                    state.text_buffer = ""
                print(f"\n[receive] {sid} turn_complete text='{text[:60]}'")
                # 残りのバッファ投入〜TTSはブロックしないよう別タスクで実行する。
                # ここでブロックすると Live セッションのターン処理が止まり、
                # 2 回目以降の応答が受信できなくなる。
                finished_pipeline = pipeline
                pipeline = TurnAudioPipeline(state)
                task = asyncio.create_task(finished_pipeline.finish(sid))
                if state:
                    state.synth_task = task
    except websockets.exceptions.ConnectionClosedOK:
        pass
    finally:
        # 接続がここで終わる時点で「次のターン用」に作った pipeline は、
        # 一度も feed/finish されないまま取り残されることがある。
        # 明示的に cancel しないと _pusher_task が pending のまま GC され、
        # "Task was destroyed but it is pending!" の警告が出る。
        pipeline.cancel()
    return handle
