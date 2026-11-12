# Privacy Policy - Userscript

Last Updated: November 12, 2026


### 0. Rule 0: Disclaimer on Modified Builds, External Packages & Unofficial Forks:

- **Original Source Integrity:** This privacy policy, safety guarantees, and security features apply strictly and exclusively to the official, unmodified extension binaries and source code distributed directly through this official repository ([hamzabellouch/userscript-ex](https://github.com/hamzabellouch/userscript-ex)) and its verified official releases.
- **Zero Liability for Modified / External Builds:** We (the publisher and maintainer) assume **no responsibility or liability whatsoever** for any modified extensions, third-party forks, repackaged `.crx` / `.xpi` / `.zip` archives, unofficial distribution channels, or altered projects not originating directly from our official releases. Any installation or use of modified, tampered, or third-party builds is entirely at your own risk, and the publisher assumes no responsibility for any consequences, damages, security compromises, or data breaches that may occur.


### 1. Executive Summary & Overview:

Userscript is a lightweight, privacy-first browser extension engineered to let users install, write, edit, and execute custom `.user.js` scripts on websites they choose. The extension operates with an uncompromising focus on digital privacy and local data sovereignty.

#### Core Privacy Commitment:
Userscript operates **100% locally on your device**. All installed scripts, script metadata, extension preferences, and script storage values are stored and evaluated strictly within your local browser. We do **not** collect, store, transmit, log, share, or sell your browsing history, installed scripts, IP address, or device fingerprints to developer servers, analytics providers, or third parties.


### 2. Information Processed On-Device:

To deliver userscript management and execution capabilities, Userscript processes operations **strictly locally within your browser**:

- **Local Script & Settings Persistence:** Installed userscripts, parsed metadata (`@name`, `@version`, `@match`, `@grant`, `@run-at`, etc.), cached `@require` code, extension preferences (`masterEnabled`, `autoCheckUpdates`, `showBadgeCount`), and per-script `GM_setValue` / `GM_getValue` storage (`scriptStorage`) are saved strictly locally via `chrome.storage.local` (Chromium) or `browser.storage.local` (Firefox). This data never leaves your browser unless you manually export a JSON or `.user.js` backup file.
- **Local URL Matching & Injection:** When you visit a webpage, the extension evaluates the current tab URL locally against your enabled scripts' `@match`, `@include`, and `@exclude` rules in `engine.js` / `background.js` and injects matching scripts into the page. Internal browser pages (`chrome://`, `edge://`, `about:`, `devtools:`, `view-source:`, `chrome-extension:`, `moz-extension:`) are explicitly excluded.
- **On-Demand Network Fetches (Install, `@require`, Updates & `GM_xmlhttpRequest`):** The extension makes no background tracking calls. Network requests occur strictly when:
  - You explicitly fetch a script from a URL to install it (`fetchScriptFromUrl`).
  - A script declares external `@require` dependencies (cached locally with `force-cache`).
  - You trigger (or enable automatic) script update checks against a script's `@updateURL`, `@downloadURL`, or source URL.
  - A user-installed script explicitly invokes `GM_xmlhttpRequest`.
- **Static Syntax Inspection:** The built-in code editor (`editor.js`) validates syntax locally using a character-level parser without sending code to any external service or executing `eval`.
- **No Browsing Activity Monitoring:** Userscript does not record, log, or transmit your browsing history or webpage contents to any external server.


### 3. Permissions Used & Their Purposes:

Userscript adheres strictly to the principle of least privilege for a full-featured userscript manager, requesting only the permissions required to manage, store, and execute user-configured scripts:

**A. Storage (`storage`, `unlimitedStorage`)**
- **Purpose:** Saves your installed userscripts, cached `@require` libraries, extension preferences, and per-script `GM_*` key-value storage locally across browser sessions without restrictive quota limits.

**B. Tabs & Active Tab (`tabs`, `activeTab`)**
- **Purpose:** Reads the active tab's URL for the popup and the "Create Script for this site" context menu action, opens the Dashboard/Editor tab, updates per-tab script count badges, and powers `GM_openInTab`.

**C. Scripting & User Scripts (`scripting`, `userScripts` [Chromium only])**
- **Purpose:** Registers and executes enabled userscripts in Chromium's isolated `USER_SCRIPT` world (`chrome.userScripts`) and provides the `scripting.executeScript` `MAIN` world fallback when direct DOM `<script>` injection is restricted.

**D. Declarative Net Request (`declarativeNetRequest`)**
- **Purpose:** Applies local header-modification rules on `main_frame` and `sub_frame` responses to remove restrictive Content Security Policy headers (`content-security-policy`, `content-security-policy-report-only`, `x-content-security-policy`, `x-webkit-csp`) so your installed userscripts and `@require` dependencies can execute reliably.

**E. Context Menus & Notifications (`contextMenus`, `notifications`)**
- **Purpose:** Adds convenient right-click menu shortcuts (`Userscript: Open Dashboard` and `Userscript: Create Script for this site`) and displays desktop notifications when requested by an installed script via `GM_notification`.

**F. Host Permissions (`<all_urls>`)**
- **Purpose:** Enables userscripts to match and execute on any website you configure via `@match` or `@include`, allows fetching scripts and `@require` libraries from user-specified URLs, and allows `GM_xmlhttpRequest` calls initiated by your installed scripts.

**G. Browser Specific Settings (Firefox Gecko ID: `userscript@tkno`, min version `109.0`)**
- **Purpose:** Required by Mozilla Firefox for extension identification, sandboxing, and Manifest V3 add-on compliance.


### 4. Safety & Content Handling Policy:

Userscript is engineered in compliance with modern browser extension security standards:

- **No Remote Extension Code:** All extension logic (`background.js`, `content.js`, `engine.js`, `popup.js`, `editor.js`) is packaged locally inside the extension archive. Only user-installed userscripts and their declared `@require` dependencies are executed in page contexts on matching sites.
- **Zero Data Exfiltration:** The extension itself possesses no analytics backends, telemetry servers, or tracking beacons.
- **Duplicate-Execution & Internal-Page Guards:** Scripts are guarded against duplicate execution across frames/worlds and are blocked from running on privileged browser URLs (`chrome://`, `edge://`, `about:`, `devtools:`, extension pages).


### 5. Data Sharing, Analytics & Advertising:

- **No Data Sharing:** Zero personal data, installed scripts, or browsing data are shared with or sold to third parties.
- **No Third-Party Analytics / Telemetry:** Userscript contains no telemetry SDKs, Google Analytics, Firebase, or tracking beacons.
- **No Advertisements:** Userscript is entirely ad-free, non-commercial, and contains no affiliate trackers.


### 6. Data Retention & Lifecycle:

- **Zero Server-Side Retention:** Because Userscript operates no external backend servers, no user data or script history is ever stored externally.
- **Complete Local Removal:** Uninstalling or removing the extension from your browser immediately halts all script execution, unregisters all dynamic rules and registered scripts, and permanently clears all locally stored scripts, preferences, and `GM_*` data.


### 7. Managing Permissions & User Rights:

You maintain complete control over Userscript and your scripts. You may pause the master engine, toggle individual scripts, export a JSON backup, or uninstall the extension at any time:

- **Chromium Browsers (Chrome, Edge, Brave, Opera, Vivaldi):** Navigate to `chrome://extensions/` (or `edge://extensions/`), locate **Userscript**, and toggle it off or click **Remove**.
- **Mozilla Firefox:** Navigate to `about:addons` > **Extensions**, locate **Userscript**, and choose **Disable** or **Remove**.


### 8. Contact & Support:

If you have any questions, feedback, or concerns regarding this Privacy Policy or the security of Userscript, please contact:  
**Email:** hamzabellouchcontact@gmail.com  
**GitHub:** [https://github.com/hamzabellouch/userscript-ex](https://github.com/hamzabellouch/userscript-ex)


-------------------------------------------



# سياسة الخصوصية - Userscript

آخر تحديث: ١٢ نوفمبر ٢٠٢٦


### ٠. القاعدة رقم ٠: إخلاء المسؤولية عن الإضافات المعدلة والحزم الخارجية والمشاريع المشتقة:

* **سلامة المصدر الأصلي:** تنطبق سياسة الخصوصية، وضمانات الأمان، والميزات المذكورة في هذه الوثيقة حصرياً وصراحةً على الإصدارات الرسمية غير المعدلة من الإضافة والشفرة المصدرية المنشورة مباشرة عبر هذا المستودع الأصلي المعتمد ([hamzabellouch/userscript-ex](https://github.com/hamzabellouch/userscript-ex)) وصفحة إصداراته الرسمية فقط.
* **إخلاء المسؤولية التام عن الحزم المشتقة أو المعدلة:** نحن (الناشر والمطور) **لا نتحمل أي مسؤولية أو التزام قانوني من أي نوع** عن أي نسخ معدلة، أو حزم خارجية غير رسمية بصيغ (`.crx` / `.xpi` / `.zip`)، أو مشاريع مشتقة تم التلاعب بها ولم تصدر مباشرة عن إصداراتنا الرسمية. استخدامك لأي نسخ خارجية يكون بالكامل على مسؤوليتك الشخصية.


### ١. الملخص التنفيذي ونطاق العمل:

إضافة Userscript هي أداة خفيفة وموجهة للخصوصية تتيح للمستخدمين تثبيت، وكتابة، وتحرير، وتشغيل السكربتات المخصصة (`.user.js`) على المواقع التي يختارونها بسهولة ومرونة، مع الالتزام الصارم بمبادئ الخصوصية وحماية البيانات المحلية.

#### التزام الخصوصية الجوهري:
تعمل إضافة Userscript **محلياً بنسبة ١٠٠٪ على جهاز المستخدم**. يتم حفظ جميع السكربتات المثبتة، وبياناتها الوصفية، وتفضيلات الإضافة، وقيم التخزين الخاصة بالسكربتات ومعالجتها بالكامل داخل متصفحك المحلي. نحن **لا نجمع**، ولا نخزن، ولا ننقل، ولا نشارك، ولا نبيع سجل تصفحك، أو سكربتاتك، أو عناوين IP، أو بصمة جهازك لأي خوادم مطورين أو شركات تحليلات أو أطراف ثالثة.


### ٢. البيانات والمعالجة المحلية داخل الجهاز:

لتقديم وظائف إدارة وتشغيل سكربتات المستخدمين، تقوم إضافة Userscript بالعمليات التالية **حصرياً داخل متصفحك**:

* **الحفظ المحلي للسكربتات والإعدادات:** يتم تخزين السكربتات المثبتة، والبيانات الوصفية المستخلصة (`@name`، `@version`، `@match`، `@grant`، `@run-at` وغيرها)، ومكتبات `@require` المخزنة مؤقتاً، وإعدادات الإضافة (`masterEnabled`، `autoCheckUpdates`، `showBadgeCount`)، وبيانات التخزين الخاصة بكل سكربت عبر `GM_setValue` / `GM_getValue` (`scriptStorage`) محلياً فقط عبر `chrome.storage.local` (في كروميوم) أو `browser.storage.local` (في فايرفوكس). لا تغادر هذه البيانات جهازك أبداً إلا إذا قمت بتصدير نسخة احتياطية بصيغة JSON أو `.user.js` يدوياً.
* **مطابقة الروابط والحقن المحلي:** عند زيارة أي صفحة ويب، تتحقق الإضافة محلياً من مطابقة الرابط مع قواعد `@match` و `@include` و `@exclude` للسكربتات المفعّلة في `engine.js` و `background.js` ثم تحقن السكربتات المطابقة في الصفحة. يتم استثناء صفحات المتصفح الداخلية (`chrome://`، `edge://`، `about:`، `devtools:`، `view-source:`، وصفحات الإضافات) بشكل صريح.
* **الطلبات الشبكية عند الحاجة فقط (التثبيت، `@require`، التحديثات، و `GM_xmlhttpRequest`):** لا تجري الإضافة أي اتصالات تتبع في الخلفية. تحدث الطلبات الشبكية حصراً عندما:
  * تطلب يدوياً جلب سكربت من رابط URL لتثبيته (`fetchScriptFromUrl`).
  * يعتمد السكربت على مكتبات خارجية عبر `@require` (حيث يتم تخزينها محلياً بآلية `force-cache`).
  * تقوم بفحص التحديثات يدوياً أو تفعيل الفحص التلقائي عبر `@updateURL` أو `@downloadURL` أو رابط المصدر.
  * يستدعي سكربت قمت بتثبيته دالة `GM_xmlhttpRequest` صراحةً.
* **الفحص الساكن لصحة الشفرة:** يقوم محرر الأكواد المدمج (`editor.js`) بالتحقق من صحة الأقواس والنصوص محلياً دون إرسال الشفرة إلى أي خدمة خارجية ودون استخدام `eval`.
* **عدم مراقبة التصفح:** لا تقوم الإضافة بتسجيل أو تتبع أو إرسال سجل تصفحك أو محتوى الصفحات إلى أي خادم خارجي.


### ٣. الأذونات المستخدمة وأسبابها:

تلتزم الإضافة بمبدأ الحد الأدنى من الأذونات اللازمة لعمل مدير سكربتات متكامل:

**أ. التخزين (`storage`, `unlimitedStorage`)**
* **الغرض:** حفظ السكربتات المثبتة، ومكتبات `@require` المخزنة، وتفضيلات المستخدم، وبيانات `GM_*` محلياً على الجهاز عبر جلسات التصفح دون قيود المساحة الافتراضية الصغيرة.

**ب. التبويبات والتبويب النشط (`tabs`, `activeTab`)**
* **الغرض:** قراءة رابط التبويب النشط داخل النافذة المنبثقة وخيار القائمة السياقية "إنشاء سكربت لهذا الموقع"، وفتح لوحة التحكم والمحرر، وتحديث عداد السكربتات على الأيقونة، وتشغيل `GM_openInTab`.

**ج. الحقن البرمجي وسكربتات المستخدم (`scripting`, `userScripts` [لمتصفحات كروميوم فقط])**
* **الغرض:** تسجيل وتنفيذ السكربتات المفعّلة في بيئة `USER_SCRIPT` المعزولة عبر واجهة `chrome.userScripts`، وتوفير مسار احتياطي عبر `scripting.executeScript` في `MAIN` world عند تعذر الحقن المباشر في DOM.

**د. تعديل ترويسات الشبكة التصرّيحي (`declarativeNetRequest`)**
* **الغرض:** تطبيق قواعد محلية لإزالة ترويسات سياسة أمان المحتوى المقيدة (`content-security-policy` وما يرتبط بها) في الإطارات (`main_frame`, `sub_frame`) لتمكين سكربتات المستخدم ومكتبات `@require` من العمل بسلاسة.

**هـ. القوائم السياقية والإشعارات (`contextMenus`, `notifications`)**
* **الغرض:** إضافة اختصارات القائمة اليمنى (`Userscript: Open Dashboard` و `Userscript: Create Script for this site`) وعرض إشعارات سطح المكتب عند طلبها من السكربتات عبر `GM_notification`.

**و. أذونات النطاقات (`<all_urls>`)**
* **الغرض:** تمكين السكربتات من العمل على أي موقع تحدده عبر `@match` أو `@include`، وجلب السكربتات ومكتبات `@require` من الروابط التي تختارها، وتنفيذ طلبات `GM_xmlhttpRequest` الصادرة عن السكربتات المثبتة.

**ز. معرف فايرفوكس (`userscript@tkno`، الحد الأدنى للإصدار `109.0`)**
* **الغرض:** مطلوب من قبل موزيلا فايرفوكس لتعريف الإضافة وضمان توافقها مع نظام Manifest V3.


### ٤. سياسة الأمان ومحاصرة البيانات:

* **عدم وجود شفرة إضافية بعيدة للإضافة:** جميع ملفات منطق الإضافة (`background.js`، `content.js`، `engine.js`، `popup.js`، `editor.js`) مدمجة محلياً داخل حزمة الإضافة. يتم تشغيل السكربتات التي يثبتها المستخدم ومكتباتها المعلنة في `@require` فقط على المواقع المطابقة.
* **انعدام تسريب البيانات:** لا تملك الإضافة أي خوادم تتبع أو نقاط اتصال خلفية (Zero Telemetry).
* **منع التنفيذ المكرر وحماية الصفحات الداخلية:** تمنع الإضافة تكرار تشغيل نفس السكربت داخل الصفحة وتمنع التشغيل على صفحات المتصفح الحساسة (`chrome://`، `edge://`، `about:`، `devtools:`، وصفحات الإضافات).


### ٥. مشاركة البيانات والإعلانات:

* **انعدام المشاركة:** لا يتم مشاركة أو بيع أي بيانات شخصية أو سكربتات أو بيانات تصفح لأي طرف ثالث.
* **انعدام التتبع والتحليلات:** خالية تماماً من أدوات Google Analytics أو حزم التتبع السلوكي.
* **انعدام الإعلانات:** أداة مجانية ونظيفة لا تعرض أي محتوى إعلاني.


### ٦. دورة حياة البيانات والحذف:

* **انعدام الاحتفاظ بالبيانات على خوادم:** لا توجد خوادم خارجية لتخزين البيانات من الأساس.
* **الحذف الكامل:** بمجرد إزالة الإضافة من المتصفح، يتوقف تنفيذ جميع السكربتات فوراً، وتُزال القواعد المسجلة، وتُمسح جميع السكربتات والإعدادات وبيانات `GM_*` المخزنة محلياً.


### ٧. إدارة الأذونات وحقوق المستخدم:

يمكنك إيقاف المحرك العام أو تعطيل أي سكربت أو تصدير نسخة احتياطية أو حذف الإضافة في أي وقت:
* **متصفحات كروم وإيدج وبريف:** اذهب إلى `chrome://extensions/`، وابحث عن **Userscript** واختر تعطيل أو إزالة (Remove).
* **متصفح فايرفوكس:** اذهب إلى `about:addons`، وابحث عن **Userscript** واختر تعطيل أو إزالة (Remove).


### ٨. التواصل والدعم:

لأي استفسارات أو بلاغات تخص الخصوصية، يرجى التواصل عبر:  
**البريد الإلكتروني:** hamzabellouchcontact@gmail.com  
**GitHub:** [https://github.com/hamzabellouch/userscript-ex](https://github.com/hamzabellouch/userscript-ex)
