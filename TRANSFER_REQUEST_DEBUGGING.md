# راهنمای عیب‌یابی درخواست جابجایی

## خطای "اطلاعات واحد سازمانی شما یافت نشد"

### علل احتمالی:

1. **ساختار داده کاربر متفاوت است**
2. **اطلاعات واحد سازمانی در JWT token موجود نیست**
3. **نام فیلدها در دیتابیس متفاوت است**
4. **مشکل در احراز هویت**

### راه‌حل‌ها:

#### 1. بررسی Console Logs

پس از اعمال تغییرات، در console سرور دنبال پیام‌های زیر باشید:

```
User data for debugging: {
  organizationalUnit: ...,
  organizationalUnitCode: ...,
  district: ...,
  districtCode: ...,
  role: ...
}
```

#### 2. فیلدهای مختلف بررسی شده:

- `user.organizationalUnit?.code`
- `user.organizationalUnitCode`
- `user.organizationCode`
- `user.orgCode`
- `user.examCenter?.code`
- `user.examCenter` (مستقیم)

#### 3. بررسی JWT Token

مطمئن شوید که در JWT token اطلاعات زیر موجود است:

```json
{
  "organizationalUnitCode": "95114939",
  "districtCode": "1656",
  "role": "examCenterManager"
}
```

#### 4. بررسی Database

در جدول Users، مطمئن شوید فیلدهای زیر پر شده‌اند:

- `organizationalUnitCode`
- `districtCode`
- `role`

### مراحل عیب‌یابی:

1. **مرحله 1**: درخواست جابجایی ثبت کنید
2. **مرحله 2**: در console سرور، پیام debug را بررسی کنید
3. **مرحله 3**: ساختار دقیق user object را یادداشت کنید
4. **مرحله 4**: در صورت نیاز، فیلدهای جدید به کد اضافه کنید

### نمونه خروجی صحیح:

```javascript
User data for debugging: {
  organizationalUnit: null,
  organizationalUnitCode: "95114939",
  district: null,
  districtCode: "1656",
  role: "examCenterManager"
}
```

### نمونه خروجی مشکل‌دار:

```javascript
User data for debugging: {
  organizationalUnit: null,
  organizationalUnitCode: null,
  district: null,
  districtCode: null,
  role: "examCenterManager"
}
```

در این حالت باید در دیتابیس کاربر، فیلد `organizationalUnitCode` تنظیم شود.
