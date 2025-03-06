// a태그안에서 실제 동작하는 코드
// 가독성을 위해 추가만해놓은 파일이며
// 해당 파일과 index.html의 a태그 내용과는 별개
(function () {
    let isResizing = false;
    let isDragging = false;
    let isAutoPositioned = true; // 사용자가 드래그하기 전엔 자동 우측 정렬 상태
    let startX, startY, startWidth, startHeight, startLeft, startTop;
    let isMinimized = false;
    let lastWidth = "500px";  // 초기 width 400px
    let lastHeight = "900px"; // 초기 height 700px
    let history = [];
    let historyIndex = -1;

    // 가상 디바이스 프레임 생성
    const deviceFrame = document.createElement("div");
    deviceFrame.style.position = "fixed";
    deviceFrame.style.top = "50px";
    // 초기 위치: 브라우저 우측 상단 (여백 50px)
    deviceFrame.style.left = (window.innerWidth - parseInt(lastWidth) - 50) + "px";
    deviceFrame.style.width = lastWidth;
    deviceFrame.style.minWidth = "350px";  // 최소 width 350px로 제한
    deviceFrame.style.maxWidth = "510px";  // 최대 width 510px로 제한
    deviceFrame.style.height = lastHeight;
    deviceFrame.style.border = "5px solid black";
    deviceFrame.style.background = "white";
    deviceFrame.style.overflow = "hidden";
    deviceFrame.style.zIndex = "9999";
    deviceFrame.style.resize = "both";
    deviceFrame.style.display = "flex";
    deviceFrame.style.flexDirection = "column";
    deviceFrame.style.boxShadow = "5px 5px 15px rgba(0, 0, 0, 0.3)";
    document.body.appendChild(deviceFrame);

    // 브라우저 크기 변화 시, 자동 정렬 상태면 우측 여백 유지
    window.addEventListener("resize", function() {
        if (isAutoPositioned) {
            deviceFrame.style.left = (window.innerWidth - deviceFrame.offsetWidth - 50) + "px";
        }
    });

    // 헤더 생성 (이동 & 버튼 컨테이너 포함)
    const header = document.createElement("div");
    header.style.background = "#333";
    header.style.color = "white";
    header.style.padding = "10px";
    header.style.cursor = "grab";
    header.style.display = "flex";
    header.style.alignItems = "center";

    const title = document.createElement("span");
    title.innerText = "PDA Preview";
    header.appendChild(title);

    // 버튼 컨테이너: 오른쪽 정렬, 접기/열기 버튼과 닫기 버튼을 순서대로 배치
    const buttonContainer = document.createElement("div");
    buttonContainer.style.marginLeft = "auto";
    buttonContainer.style.display = "flex";
    buttonContainer.style.gap = "5px";

    const minimizeButton = document.createElement("button");
    minimizeButton.innerText = "-";
    minimizeButton.style.background = "gray";
    minimizeButton.style.color = "white";
    minimizeButton.style.border = "none";
    minimizeButton.style.cursor = "pointer";
    minimizeButton.style.padding = "5px 10px";
    minimizeButton.style.fontWeight = "bold";
    minimizeButton.onclick = () => toggleMinimize();
    buttonContainer.appendChild(minimizeButton);

    const closeButton = document.createElement("button");
    closeButton.innerText = "X";
    closeButton.style.background = "red";
    closeButton.style.color = "white";
    closeButton.style.border = "none";
    closeButton.style.cursor = "pointer";
    closeButton.style.padding = "5px 10px";
    closeButton.style.fontWeight = "bold";
    closeButton.onclick = () => deviceFrame.remove();
    buttonContainer.appendChild(closeButton);

    header.appendChild(buttonContainer);
    deviceFrame.appendChild(header);

    // 내부 iframe 생성 (현재 페이지 로드)
    const iframe = document.createElement("iframe");
    iframe.src = window.location.href;
    iframe.style.width = "100%";
    iframe.style.flexGrow = "1";
    iframe.style.border = "none";
    deviceFrame.appendChild(iframe);

    // iframe 내부의 뒤로가기 버튼 수정 (내부 history만 조작)
    iframe.addEventListener("load", function() {
        try {
            const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
            const backButton = innerDoc.getElementById("backButton");
            if (backButton) {
                backButton.addEventListener("click", function(event) {
                    event.preventDefault();
                    event.stopPropagation(); // 부모 창으로 이벤트 전파 차단
                    iframe.contentWindow.history.back(); // iframe 내에서만 뒤로가기
                });
            }
        } catch (err) {
            console.error("iframe 내부 컨텐츠에 접근할 수 없습니다:", err);
        }
    });

    // 바코드 히스토리 컨테이너 생성
    const historyContainer = document.createElement("div");
    historyContainer.style.height = "150px";
    historyContainer.style.background = "#222";
    historyContainer.style.color = "#fff";
    historyContainer.style.display = "flex";
    historyContainer.style.flexDirection = "column-reverse"; // 최신 항목이 위로
    historyContainer.style.padding = "5px";
    historyContainer.style.overflowY = "auto";
    deviceFrame.appendChild(historyContainer);

    // 바코드 입력창 컨테이너 생성
    const barcodeContainer = document.createElement("div");
    barcodeContainer.style.height = "50px";
    barcodeContainer.style.background = "#222";
    barcodeContainer.style.display = "flex";
    barcodeContainer.style.padding = "5px";

    const barcodeInput = document.createElement("input");
    barcodeInput.type = "text";
    barcodeInput.placeholder = "Enter barcode...";
    barcodeInput.style.flexGrow = "1";
    barcodeInput.style.background = "#111";
    barcodeInput.style.color = "#fff";
    barcodeInput.style.border = "none";
    barcodeInput.style.outline = "none";
    barcodeInput.style.padding = "5px";
    barcodeInput.style.fontSize = "14px";
    barcodeInput.style.fontFamily = "monospace";
    barcodeContainer.appendChild(barcodeInput);

    const scanButton = document.createElement("button");
    scanButton.innerText = "▶";
    scanButton.style.background = "green";
    scanButton.style.color = "white";
    scanButton.style.border = "none";
    scanButton.style.cursor = "pointer";
    scanButton.style.padding = "5px 15px";
    scanButton.style.fontSize = "14px";
    scanButton.style.fontWeight = "bold";
    scanButton.onclick = executeScanBarcode;
    barcodeContainer.appendChild(scanButton);

    deviceFrame.appendChild(barcodeContainer);

    // scanBarcode 실행 함수
    function executeScanBarcode() {
        const barcode = barcodeInput.value.trim();
        if (barcode) {
            try {
                iframe.contentWindow.eval(`scanBarcode("${barcode}")`);
                addBarcodeToHistory(barcode);
                barcodeInput.value = "";
            } catch (error) {
                console.error("Error executing scanBarcode:", error);
            }
        }
    }

    // 바코드 입력창에서 엔터 및 화살표 키 처리
    barcodeInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            executeScanBarcode();
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (historyIndex > 0) {
                historyIndex--;
                barcodeInput.value = history[historyIndex];
            }
        } else if (event.key === "ArrowDown") {
            event.preventDefault();
            if (historyIndex < history.length - 1) {
                historyIndex++;
                barcodeInput.value = history[historyIndex];
            } else {
                historyIndex = history.length;
                barcodeInput.value = "";
            }
        }
    });

    // 바코드 히스토리에 추가하는 함수
    function addBarcodeToHistory(barcode) {
        history.push(barcode);
        if (history.length > 50) history.shift(); // 최대 50개 기록 유지
        historyIndex = history.length;

        const barcodeItem = document.createElement("div");
        barcodeItem.textContent = barcode;
        barcodeItem.style.padding = "5px";
        barcodeItem.style.borderBottom = "1px solid #444";
        barcodeItem.style.fontSize = "14px";
        barcodeItem.style.cursor = "pointer";
        barcodeItem.onclick = () => {
            barcodeInput.value = barcode;
        };

        historyContainer.prepend(barcodeItem);
    }

    // 창 접기/펼치기 기능
    function toggleMinimize() {
        if (isMinimized) {
            deviceFrame.style.width = lastWidth;
            deviceFrame.style.height = lastHeight;
            iframe.style.display = "block";
            barcodeContainer.style.display = "flex";
            historyContainer.style.display = "flex";
            minimizeButton.innerText = "-";
        } else {
            lastWidth = deviceFrame.style.width;
            lastHeight = deviceFrame.style.height;
            deviceFrame.style.width = "200px";
            deviceFrame.style.height = "50px";
            iframe.style.display = "none";
            barcodeContainer.style.display = "none";
            historyContainer.style.display = "none";
            minimizeButton.innerText = "+";
        }
        isMinimized = !isMinimized;
    }

    // 헤더를 통한 창 이동 기능
    header.addEventListener("mousedown", (event) => {
        // 사용자가 드래그하면 자동 우측 정렬 상태 해제
        isAutoPositioned = false;
        isDragging = true;
        startX = event.clientX;
        startY = event.clientY;
        startLeft = deviceFrame.offsetLeft;
        startTop = deviceFrame.offsetTop;
        document.addEventListener("mousemove", dragWindow);
        document.addEventListener("mouseup", () => isDragging = false);
    });

    function dragWindow(event) {
        if (!isDragging) return;
        deviceFrame.style.left = `${startLeft + event.clientX - startX}px`;
        deviceFrame.style.top = `${startTop + event.clientY - startY}px`;
    }
})();
