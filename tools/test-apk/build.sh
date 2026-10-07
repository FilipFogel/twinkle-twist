#!/bin/sh
# Builds the test APK without Gradle. Requires aapt2, javac, dalvik-exchange (dx), zipalign and apksigner
# plus an android.jar (API 34). Run from the project root:  sh tools/test-apk/build.sh /path/android.jar
set -e
JAR="$1"; [ -f "$JAR" ] || { echo "Give the path to android.jar (API 34)"; exit 1; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; T="$ROOT/tools/test-apk"; OUT="$ROOT/build/test-apk"
rm -rf "$OUT"; mkdir -p "$OUT/res/values" "$OUT/res/drawable" "$OUT/res/mipmap-anydpi-v26" "$OUT/src/app/twinkletwist/game/test" "$OUT/classes"
cp "$T/values.xml" "$OUT/res/values/"
cp "$ROOT"/app/src/main/res/drawable/*.xml "$OUT/res/drawable/"
cp "$ROOT/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml" "$OUT/res/mipmap-anydpi-v26/"
cp "$T/MainActivity.java" "$OUT/src/app/twinkletwist/game/test/"
aapt2 compile --dir "$OUT/res" -o "$OUT/res.zip"
mkdir -p "$OUT/gen"
aapt2 link -o "$OUT/base.apk" -I "$JAR" --manifest "$T/AndroidManifest.xml" --java "$OUT/gen" -A "$ROOT/app/src/main/assets" "$OUT/res.zip"
javac -encoding UTF-8 -Xlint:-options -source 8 -target 8 -bootclasspath "$JAR" -d "$OUT/classes" "$OUT/src/app/twinkletwist/game/test/MainActivity.java" "$OUT/gen/app/twinkletwist/game/test/R.java"
dalvik-exchange --dex --min-sdk-version=26 --output="$OUT/classes.dex" "$OUT/classes"
cp "$OUT/base.apk" "$OUT/unsigned.apk"; (cd "$OUT" && zip -q -j unsigned.apk classes.dex)
zipalign -p -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
[ -f "$OUT/../test.keystore" ] || keytool -genkeypair -keystore "$OUT/../test.keystore" -storepass twinkletwist -keypass twinkletwist -alias test -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Twinkle Twist test build" >/dev/null 2>&1
apksigner sign --ks "$OUT/../test.keystore" --ks-pass pass:twinkletwist --key-pass pass:twinkletwist --ks-key-alias test --min-sdk-version 26 --out "$OUT/twinkle-twist-test.apk" "$OUT/aligned.apk"
echo "Done: $OUT/twinkle-twist-test.apk"
