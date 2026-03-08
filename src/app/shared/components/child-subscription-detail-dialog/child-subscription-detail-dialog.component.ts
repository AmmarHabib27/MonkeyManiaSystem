import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-child-subscription-detail-dialog',
  templateUrl: './child-subscription-detail-dialog.component.html',
  styleUrls: ['./child-subscription-detail-dialog.component.scss'],
})
export class ChildSubscriptionDetailDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ChildSubscriptionDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onClose() {
    this.dialogRef.close();
  }

  onPrint() {
    const d = this.data;
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>تفاصيل الاشتراك</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 13px;
            color: #000;
            background: #f5f5f5;
            direction: rtl;
            padding: 20px;
          }
          .page {
            max-width: 800px;
            margin: 0 auto;
            background: #fff;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          }
          .print-bar {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 20px;
          }
          .print-bar button {
            background: #1976d2;
            color: #fff;
            border: none;
            border-radius: 6px;
            padding: 10px 28px;
            font-size: 15px;
            cursor: pointer;
            font-family: 'Arial', sans-serif;
          }
          .print-bar button:hover { background: #1565c0; }
          .title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 20px;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 10px;
            color: #1976d2;
          }
          .section { margin-bottom: 16px; }
          .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            border-bottom: 1px solid #eee;
            font-size: 13px;
          }
          .row:nth-child(even) { background: #f9f9f9; }
          .row span:first-child { font-weight: bold; color: #333; }
          .row span:last-child { color: #111; }
          .divider { border: none; border-top: 2px dashed #ccc; margin: 12px 0; }
          .highlight span:last-child { font-weight: bold; font-size: 15px; color: #1976d2; }
          @media print {
            body { background: #fff; padding: 0; }
            .page { box-shadow: none; border-radius: 0; padding: 8px; max-width: 80mm; }
            .print-bar { display: none !important; }
            .row { padding: 4px 4px; font-size: 11px; }
            .title { font-size: 14px; }
            @page { size: 80mm auto; margin: 4mm; }
          }
        </style>
      </head>
      <body> 
        <div class="page">
          <div class="print-bar">
            <button onclick="window.print()">🖨️ طباعة</button>
          </div>
          <div class="title">🎟️ تفاصيل الاشتراك</div>
          <div class="section">
            <div class="row"><span>الطفل</span><span>${d.child ?? ''}</span></div>
            <div class="row"><span>الاشتراك</span><span>${d.subscription ?? ''}</span></div>
            <div class="row"><span>الفرع</span><span>${d.branch ?? ''}</span></div>
          </div>
          <hr class="divider"/>
          <div class="section">
            <div class="row"><span>كاش</span><span>${d.cash ?? 0}</span></div>
            <div class="row"><span>فيزا</span><span>${d.visa ?? 0}</span></div>
            <div class="row"><span>انستاباي</span><span>${d.instapay ?? 0}</span></div>
            <div class="row highlight"><span>السعر</span><span>${d.price ?? 0}</span></div>
            <div class="row"><span>الفروع المتاحة</span><span>${d.usable_in_branches ?? ''}</span></div>
          </div>
          <hr class="divider"/>
          <div class="section">
            <div class="row"><span>ساعات الاشتراك</span><span>${d.base_hours ?? 0}</span></div>
            <div class="row"><span>الساعات المتبقية</span><span>${d.remaining_hours ?? 0}</span></div>
            <div class="row"><span>تاريخ الانتهاء</span><span>${d.expire_date ?? ''}</span></div>
            <div class="row"><span>الحالة</span><span>${d.is_active ? 'نشط ✅' : 'غير نشط ❌'}</span></div>
          </div>
          <hr class="divider"/>
          <div class="section">
            <div class="row"><span>أنشئ بواسطة</span><span>${d.created_by ?? ''}</span></div>
            <div class="row"><span>تاريخ الإنشاء</span><span>${d.created ? new Date(d.created).toLocaleString('ar-EG') : ''}</span></div>
          </div>
        </div>
      </body>
      </html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.documentElement.innerHTML = html;
    }
  }
}
