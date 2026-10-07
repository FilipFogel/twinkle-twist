// Shared build rules for the whole project. The app itself lives in the :app module.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
}
