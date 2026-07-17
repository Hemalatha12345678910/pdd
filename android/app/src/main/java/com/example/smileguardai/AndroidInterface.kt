package com.example.smileguardai

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.widget.Toast
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

class AndroidInterface(private val context: Context) {

    @JavascriptInterface
    fun downloadPdf(filename: String, base64Data: String) {
        try {
            val pdfBytes = Base64.decode(base64Data, Base64.DEFAULT)
            val resolver = context.contentResolver
            
            val outputStream: OutputStream?
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                outputStream = uri?.let { resolver.openOutputStream(it) }
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val file = File(downloadsDir, filename)
                outputStream = FileOutputStream(file)
            }

            if (outputStream != null) {
                outputStream.use {
                    it.write(pdfBytes)
                }
                (context as? android.app.Activity)?.runOnUiThread {
                    Toast.makeText(context, "PDF saved to Downloads: $filename", Toast.LENGTH_LONG).show()
                }
            } else {
                throw Exception("Could not open output stream")
            }
        } catch (e: Exception) {
            e.printStackTrace()
            (context as? android.app.Activity)?.runOnUiThread {
                Toast.makeText(context, "Failed to save PDF: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    @JavascriptInterface
    fun shareText(title: String, text: String) {
        try {
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_SUBJECT, title)
                putExtra(Intent.EXTRA_TEXT, text)
            }
            val chooser = Intent.createChooser(shareIntent, "Share via")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(chooser)
        } catch (e: Exception) {
            e.printStackTrace()
            (context as? android.app.Activity)?.runOnUiThread {
                Toast.makeText(context, "Failed to share: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
