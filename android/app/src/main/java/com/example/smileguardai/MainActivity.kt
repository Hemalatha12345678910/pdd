package com.example.smileguardai

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.webkit.WebViewAssetLoader
import com.example.smileguardai.theme.SmileGuardAITheme
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {

    private var webView: WebView? = null
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraPhotoUri: Uri? = null
    private var cameraPhotoPath: String? = null

    // Register Activity Result launcher for file chooser
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val resultCode = result.resultCode
        val intent = result.data
        
        var results: Array<Uri>? = null
        if (resultCode == Activity.RESULT_OK) {
            val dataUri = intent?.data
            val clipData = intent?.clipData
            
            if (clipData != null && clipData.itemCount > 0) {
                val uris = mutableListOf<Uri>()
                for (i in 0 until clipData.itemCount) {
                    uris.add(clipData.getItemAt(i).uri)
                }
                results = uris.toTypedArray()
            } else if (dataUri != null) {
                results = arrayOf(dataUri)
            } else {
                cameraPhotoUri?.let {
                    results = arrayOf(it)
                }
            }
        }
        filePathCallback?.onReceiveValue(results)
        filePathCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        enableEdgeToEdge()

        checkAndRequestPermissions()

        // Handle back button presses in WebView
        val onBackPressedCallback = object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val wv = webView
                if (wv != null && wv.canGoBack()) {
                    wv.goBack()
                } else {
                    // Disable callback and trigger standard back behavior (exit app)
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        }
        onBackPressedDispatcher.addCallback(this, onBackPressedCallback)

        setContent {
            SmileGuardAITheme {
                Surface(
                    modifier = Modifier.fillMaxSize().systemBarsPadding(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AndroidView(
                        modifier = Modifier.fillMaxSize(),
                        factory = { context ->
                            WebView(context).apply {
                                webView = this
                                
                                // Enable WebView settings
                                settings.javaScriptEnabled = true
                                settings.domStorageEnabled = true
                                settings.databaseEnabled = true
                                settings.allowFileAccess = true
                                settings.allowContentAccess = true
                                settings.allowFileAccessFromFileURLs = true
                                settings.allowUniversalAccessFromFileURLs = true
                                settings.loadsImagesAutomatically = true
                                settings.blockNetworkImage = false
                                settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
                                clearCache(true)
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                                    settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                                }
                                
                                // Configure WebViewAssetLoader
                                val assetLoader = WebViewAssetLoader.Builder()
                                    .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
                                    .build()

                                webViewClient = object : WebViewClient() {
                                    override fun shouldInterceptRequest(
                                        view: WebView,
                                        request: WebResourceRequest
                                    ): WebResourceResponse? {
                                        return assetLoader.shouldInterceptRequest(request.url)
                                    }
                                }

                                 // Configure WebChromeClient with onShowFileChooser
                                 webChromeClient = object : WebChromeClient() {
                                     override fun onJsAlert(
                                         view: WebView?,
                                         url: String?,
                                         message: String?,
                                         result: android.webkit.JsResult?
                                     ): Boolean {
                                         android.app.AlertDialog.Builder(this@MainActivity)
                                             .setTitle("Smile Guard AI")
                                             .setMessage(message)
                                             .setPositiveButton(android.R.string.ok) { _, _ ->
                                                 result?.confirm()
                                             }
                                             .setCancelable(false)
                                             .show()
                                         return true
                                     }

                                     override fun onShowFileChooser(
                                        webView: WebView?,
                                        filePathCallback: ValueCallback<Array<Uri>>?,
                                        fileChooserParams: FileChooserParams?
                                    ): Boolean {
                                        this@MainActivity.filePathCallback?.onReceiveValue(null)
                                        this@MainActivity.filePathCallback = filePathCallback

                                        // Request camera permission if not granted
                                        if (ContextCompat.checkSelfPermission(
                                                this@MainActivity,
                                                Manifest.permission.CAMERA
                                            ) != PackageManager.PERMISSION_GRANTED
                                        ) {
                                            ActivityCompat.requestPermissions(
                                                this@MainActivity,
                                                arrayOf(Manifest.permission.CAMERA),
                                                100
                                            )
                                        }

                                        // Camera capture intent
                                        val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                                        var photoFile: File? = null
                                        var uri: Uri? = null

                                        try {
                                            photoFile = createImageFile()
                                            if (photoFile != null) {
                                                uri = FileProvider.getUriForFile(
                                                    this@MainActivity,
                                                    "com.example.smileguardai.fileprovider",
                                                    photoFile
                                                )
                                                takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, uri)
                                            }
                                        } catch (ex: Exception) {
                                            ex.printStackTrace()
                                        }
                                        cameraPhotoUri = uri
                                        cameraPhotoPath = photoFile?.absolutePath

                                        // Gallery / File selection Intent
                                        val contentSelectionIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
                                            addCategory(Intent.CATEGORY_OPENABLE)
                                            type = "image/*"
                                        }

                                        val intentArray: Array<Intent> = if (uri != null) {
                                            arrayOf(takePictureIntent)
                                        } else {
                                            emptyArray()
                                        }

                                        val chooserIntent = Intent(Intent.ACTION_CHOOSER).apply {
                                            putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
                                            putExtra(Intent.EXTRA_TITLE, "Select Image Source")
                                            putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray)
                                        }

                                        fileChooserLauncher.launch(chooserIntent)
                                        return true
                                    }
                                }

                                // Add Javascript Interface named "AndroidInterface"
                                addJavascriptInterface(AndroidInterface(context), "AndroidInterface")

                                // Load the index.html served locally
                                loadUrl("https://appassets.androidplatform.net/assets/index.html")
                            }
                        }
                    )
                }
            }
        }
    }

    private fun createImageFile(): File? {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        val imageFileName = "JPEG_" + timeStamp + "_"
        val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile(
            imageFileName,
            ".jpg",
            storageDir
        )
    }

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf<String>()
        
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.CAMERA)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.READ_MEDIA_IMAGES)
            }
        } else {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }
        
        if (permissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toTypedArray(), 101)
        }
    }
}
