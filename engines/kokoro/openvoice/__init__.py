"""
OpenVoice v2 tone-colour converter, the parts Mimix needs (MIT licence, see LICENSE).

Vendored from https://github.com/myshell-ai/OpenVoice at commit 74a1d147b17a8c3092dd5430504bd83ef6c7eb23
(2025-04-19): models.py, modules.py, attentions.py, commons.py and transforms.py, unchanged except that
`from openvoice import x` became `from . import x`. The text-to-speech half (MeloTTS), the Whisper-based
splitter and the watermark model are left out; tone.py in the engine folder loads the converter.
"""
