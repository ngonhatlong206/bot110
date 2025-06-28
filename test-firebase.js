#!/usr/bin/env node

const { saveCookie, loadCookie, checkCookieStatus, updateCookieStatus, deleteCookie, getAllCookies } = require('./lib/firebaseManager');
const firebaseConfig = require('./firebase-config.js');

console.log('🧪 Testing Firebase Integration...\n');

async function testFirebase() {
    console.log('🧪 Bắt đầu test Firebase...\n');
    
    const testEmail = firebaseConfig.defaultEmail;
    const testCookie = [
        {
            "key": "sb",
            "value": "test_cookie_value",
            "domain": "facebook.com",
            "path": "/",
            "hostOnly": false,
            "creation": new Date().toISOString(),
            "lastAccessed": new Date().toISOString()
        }
    ];

    try {
        // Test 1: Kiểm tra trạng thái cookie
        console.log('1️⃣ Kiểm tra trạng thái cookie...');
        const status = await checkCookieStatus(testEmail);
        console.log('Trạng thái:', status);
        
        // Test 2: Lưu cookie
        console.log('\n2️⃣ Lưu cookie test...');
        const saveResult = await saveCookie(testCookie, testEmail);
        console.log('Kết quả lưu:', saveResult);
        
        // Test 3: Tải cookie
        console.log('\n3️⃣ Tải cookie...');
        const loadedCookie = await loadCookie(testEmail);
        console.log('Cookie đã tải:', loadedCookie ? 'Thành công' : 'Thất bại');
        
        // Test 4: Lấy danh sách tất cả cookie
        console.log('\n4️⃣ Lấy danh sách tất cả cookie...');
        const allCookies = await getAllCookies();
        console.log('Số lượng cookie:', allCookies.length);
        console.log('Danh sách:', allCookies);
        
        // Test 5: Cập nhật trạng thái
        console.log('\n5️⃣ Cập nhật trạng thái cookie...');
        const updateResult = await updateCookieStatus('test_status', testEmail);
        console.log('Kết quả cập nhật:', updateResult);
        
        // Test 6: Xóa cookie test
        console.log('\n6️⃣ Xóa cookie test...');
        const deleteResult = await deleteCookie(testEmail);
        console.log('Kết quả xóa:', deleteResult);
        
        console.log('\n✅ Test Firebase hoàn thành!');
        
    } catch (error) {
        console.error('❌ Lỗi trong quá trình test:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Chạy test
testFirebase().then(() => {
    console.log('\n🏁 Test completed. Exiting...');
    process.exit(0);
}).catch((error) => {
    console.log('\n💥 Test crashed:');
    console.log(error);
    process.exit(1);
}); 