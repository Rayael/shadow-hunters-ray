@@
-if __name__ == '__main__':
-    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
+if __name__ == '__main__':
+    # In production, use the PORT provided by the platform (Railway)
+    port = int(os.getenv('PORT', 5000))
+    # Disable debug in production
+    socketio.run(app, debug=False, host="0.0.0.0", port=port)
