{
  "targets": [
    {
      "target_name": "process_monitor",
      "sources": [
        "native/addon.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "conditions": [
        ["OS=='linux'", {
          "sources": ["native/linux.cpp"],
          "cflags": ["-std=c++17"],
          "cflags_cc": ["-std=c++17"]
        }],
        ["OS=='win'", {
          "sources": ["native/windows.cpp"],
          "libraries": [ "-lpsapi.lib" ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            }
          }
        }]
      ]
    }
  ]
}
