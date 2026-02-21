# 应用构建流程

## 前置准备：在 WSL2 中搭建环境

1. **安装 JDK 17**

   bash

   ```
   sudo apt update
   sudo apt install openjdk-17-jdk -y
   echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
   echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

   

2. **安装 Android SDK**（详细步骤可参考之前文档）

   bash

   ```
   # 下载命令行工具并解压到 ~/android-sdk
   # 设置环境变量
   export ANDROID_HOME=$HOME/android-sdk
   export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH
   # 接受许可证并安装必要组件
   sdkmanager --licenses
   sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
   ```

   

3. **安装 Node.js（推荐 nvm）**

   bash

   ```
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   source ~/.bashrc
   nvm install --lts
   ```

   

4. **安装 EAS CLI**（可全局安装，用于本地构建）

   bash

   ```
   npm install -g eas-cli
   ```

   > **说明**：全局安装的 `expo-cli` 已不再维护，所有 Expo 命令都应通过 `npx expo` 运行，确保使用项目依赖中的正确版本。

------

## 将项目从 Windows 迁移到 WSL2

1. **删除 WSL2 中的旧项目文件夹（如有）**

   bash

   ```
   rm -rf ~/projects/soaring-schedule-expo
   ```

   

2. **复制项目（排除 node_modules）**

   bash

   ```
   rsync -avh --progress --exclude='node_modules' /mnt/f/project/soaringSchedule/soaring-schedule-expo/ ~/projects/soaring-schedule-expo/
   ```

   

3. **进入项目目录并安装依赖**

   bash

   ```
   cd ~/projects/soaring-schedule-expo
   npm install
   ```

   

------

## 使用本地 Expo CLI 生成原生代码（prebuild）

bash

```
npx expo prebuild --clean
```



- 此命令会根据 `app.json` 生成 `android` 和（如果需要）`ios` 文件夹。
- `--clean` 会先删除已存在的原生文件夹，确保最新配置生效。

------

## 配置应用签名

1. **生成密钥库（如果还没有）**

   bash

   ```
   keytool -genkey -v -keystore android/app/my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

   

2. **编辑 `android/gradle.properties`**，添加签名信息

   properties

   ```
   MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
   MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
   MYAPP_UPLOAD_STORE_PASSWORD=你的密码
   MYAPP_UPLOAD_KEY_PASSWORD=你的密码
   ```

   

3. **编辑 `android/app/build.gradle`**，在 `android` 块中配置签名

   gradle

   ```
   signingConfigs {
       release {
           if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
               storeFile file(MYAPP_UPLOAD_STORE_FILE)
               storePassword MYAPP_UPLOAD_STORE_PASSWORD
               keyAlias MYAPP_UPLOAD_KEY_ALIAS
               keyPassword MYAPP_UPLOAD_KEY_PASSWORD
           }
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
           // 其他配置...
       }
   }
   ```

   

------

## 执行本地构建（使用 EAS）

1. **确保项目根目录有 `eas.json` 配置文件**（若没有，运行 `eas build:configure` 生成）。
   示例 `eas.json` 中的 `preview` 配置：

   json

   ```
   {
     "build": {
       "preview": {
         "android": {
           "buildType": "apk"
         }
       }
     }
   }
   ```

   

2. **运行本地构建**

   bash

   ```
   eas build --platform android --profile preview --local
   ```

   

3. **等待构建完成**，APK 将生成在：

   text

   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

   

------

## 将 APK 传输到 Windows

构建成功后，通过以下任一方式将 APK 复制到 Windows：

- **使用 `explorer.exe .`** 打开当前目录的 Windows 窗口，直接拖拽文件。
- **使用 `cp` 命令** 复制到 `/mnt/c/` 或 `/mnt/f/` 下的 Windows 目录。

```
explorer.exe .
```

