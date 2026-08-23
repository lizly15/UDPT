#!/bin/bash
# Smoke test các kịch bản nghiệp vụ SC-01..SC-10 (Phụ lục A.12).
# Yêu cầu: hệ thống đã UP và đã chạy seed.py.
#   bash scripts/smoke-test.sh
set -u
G="http://localhost:8080/api"
PASS=0; FAIL=0
SFX=$(date +%s)   # hậu tố để tạo mã duy nhất, chạy lại được

jget(){ python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null; }
login(){ curl -s -X POST $G/auth/login -H 'Content-Type: application/json' -d "{\"username\":\"$1\",\"password\":\"$2\"}" | jget 'd["access_token"]'; }
H(){ echo "Authorization: Bearer $1"; }
# code PATH TOKEN [METHOD] [BODY]
code(){ local p=$1 t=$2 m=${3:-GET} b=${4:-}; curl -s -o /dev/null -w "%{http_code}" -X $m "$G$p" -H "$(H $t)" -H 'Content-Type: application/json' ${b:+-d "$b"}; }
body(){ local p=$1 t=$2 m=${3:-GET} b=${4:-}; curl -s -X $m "$G$p" -H "$(H $t)" -H 'Content-Type: application/json' ${b:+-d "$b"}; }
check(){ if [ "$2" = "$3" ]; then echo "  ✅ $1"; PASS=$((PASS+1)); else echo "  ❌ $1 (mong đợi '$3', nhận '$2')"; FAIL=$((FAIL+1)); fi; }
contains(){ case "$2" in *"$3"*) echo "  ✅ $1"; PASS=$((PASS+1));; *) echo "  ❌ $1 (không thấy '$3' trong: $2)"; FAIL=$((FAIL+1));; esac; }

SALE=$(login sale01 pass123); MGR=$(login manager01 pass123); OPS=$(login ops01 pass123)
ACC=$(login account01 pass123); DIR=$(login director01 pass123)
approve(){ local t=$1; local id=$(body /tasks/inbox $t | jget 'd[0]["id"]'); [ -z "$id" ] && return 1; code /tasks/$id/approve $t POST '{"comment":"ok"}'; }

echo "===== SMOKE TEST SC-01..SC-10 ====="

echo "SC-01: Tạo hợp đồng chưa đính kèm -> không cho Submit"
C=SC01-$SFX
code /contracts $SALE POST "{\"code\":\"$C\",\"customer_code\":\"KH0001\",\"title\":\"t\"}" >/dev/null
body /contracts/$C $SALE PUT '{"effective_from":"2026-07-01","effective_to":"2026-12-31","has_attachment":false}' >/dev/null
R=$(body /contracts/$C/submit $SALE POST | jget 'd["error"]["code"]')
check "SC-01 chặn submit thiếu đính kèm" "$R" "NO_ATTACHMENT"

echo "SC-02: Hai bảng giá chồng thời gian hiệu lực -> báo lỗi"
PL=PLSC02-$SFX
code /pricing/lists $SALE POST "{\"code\":\"$PL\",\"name\":\"t\",\"customer_code\":\"KH0003\"}" >/dev/null
V1=$(body /pricing/lists/$PL/versions $SALE POST '{"effective_from":"2026-01-01","effective_to":"2026-12-31","items":[{"service_code":"DV001","unit_price":100}]}' | jget 'd["id"]')
body /pricing/versions/$V1/submit $SALE POST >/dev/null; approve $MGR >/dev/null; approve $DIR >/dev/null; sleep 2
V2=$(body /pricing/lists/$PL/versions $SALE POST '{"effective_from":"2026-06-01","effective_to":"2026-08-31","items":[{"service_code":"DV001","unit_price":200}]}' | jget 'd["id"]')
R=$(body /pricing/versions/$V2/submit $SALE POST | jget 'd["error"]["code"]')
check "SC-02 chặn chồng hiệu lực" "$R" "EFFECTIVE_OVERLAP"

echo "SC-03: Lập bảng thanh toán khi hợp đồng hết hạn -> không cho phép"
LEGAL=$(login legal01 pass123)
# duyệt đúng task thuộc instance chỉ định (inbox có thể lẫn task của nhiều hồ sơ)
approve_inst(){ local tok=$1 inst=$2; local id=$(body /tasks/inbox $tok | python3 -c "import sys,json;d=json.load(sys.stdin);print(next((t['id'] for t in d if t['instance_id']=='$inst'),''))" 2>/dev/null); [ -z "$id" ] && return 1; code /tasks/$id/approve $tok POST '{"comment":"ok"}' >/dev/null; }
C3=SC03-$SFX
code /contracts $SALE POST "{\"code\":\"$C3\",\"customer_code\":\"KH0002\",\"title\":\"cũ\"}" >/dev/null
body /contracts/$C3 $SALE PUT '{"effective_from":"2024-01-01","effective_to":"2024-12-31","has_attachment":true}' >/dev/null
INST=$(body /contracts/$C3/submit $SALE POST | jget 'd["workflow_instance_id"]')
for _ in $(seq 1 6); do for tok in $MGR $LEGAL $ACC $DIR; do approve_inst $tok $INST; done; sleep 0.5; done
for _ in $(seq 1 15); do sleep 1; [ "$(body /contracts/$C3 $SALE | jget 'd["status"]')" = "Approved" ] && break; done
body /contracts/$C3/activate $SALE POST >/dev/null
R=$(body /payments/generate $ACC POST "{\"customer_code\":\"KH0002\",\"contract_code\":\"$C3\",\"period\":\"2026-08\"}" | jget 'd["error"]["code"]')
check "SC-03 chặn thanh toán HĐ hết hạn" "$R" "CONTRACT_EXPIRED"

echo "SC-04: Đổi bảng giá sau phát hành -> bảng thanh toán cũ giữ nguyên đơn giá"
UP=$(body "/payments?customer_code=KH0001&status=Issued" $ACC | jget '[l["unit_price"] for p in d for l in p["lines"] if l["service_code"]=="DV003"][0]')
check "SC-04 đơn giá DV003 đã copy giữ nguyên 120000" "${UP%.*}" "120000"

echo "SC-05: Hai người cùng Approve -> chỉ một thành công"
C5=SC05-$SFX
code /contracts $SALE POST "{\"code\":\"$C5\",\"customer_code\":\"KH0001\",\"title\":\"race\"}" >/dev/null
body /contracts/$C5 $SALE PUT '{"effective_from":"2026-07-01","effective_to":"2026-12-31","has_attachment":true}' >/dev/null
body /contracts/$C5/submit $SALE POST >/dev/null
TID=$(body /tasks/inbox $MGR | jget 'd[0]["id"]')
c1=$(code /tasks/$TID/approve $MGR POST '{"comment":"a"}') &
c2=$(code /tasks/$TID/approve $MGR POST '{"comment":"b"}')
wait
# một trong hai phải là 2xx, cái còn lại là 409 (không thể cùng thành công)
R2=$(code /tasks/$TID/approve $MGR POST '{"comment":"c"}')  # bước đã xong -> phải 409
check "SC-05 duyệt lại bước đã xong bị chặn" "$R2" "409"

echo "SC-06: Ký điện tử -> có endpoint gửi ký lại"
DOCID=$(body "/payments?customer_code=KH0001&status=Issued" $ACC | jget 'd[0]["id"]')
R=$(code /workflows/esign/$DOCID/retry $ACC POST)
check "SC-06 endpoint retry ký hoạt động" "$R" "200"

echo "SC-07: Notification Service lỗi -> nghiệp vụ chính KHÔNG lỗi + bù sự kiện khi phục hồi"
( cd "$(dirname "$0")/.." && docker compose stop notification-service >/dev/null 2>&1 )
C7=SC07-$SFX
R=$(code /contracts $SALE POST "{\"code\":\"$C7\",\"customer_code\":\"KH0001\",\"title\":\"n\"}")
check "SC-07 tạo hợp đồng khi notif chết vẫn OK" "$R" "201"
body /contracts/$C7 $SALE PUT '{"effective_from":"2026-07-01","effective_to":"2026-12-31","has_attachment":true}' >/dev/null
R=$(code /contracts/$C7/submit $SALE POST)
check "SC-07 submit khi notif chết vẫn OK" "$R" "200"
( cd "$(dirname "$0")/.." && docker compose start notification-service >/dev/null 2>&1 )
AUD=0
for _ in $(seq 1 20); do   # poll tới 40s: chờ notif boot + consumer rejoin + bù event
  sleep 2
  AUD=$(body "/audit?doc_id=$C7" $DIR | jget 'len(d)')
  [ "${AUD:-0}" -ge 1 ] && break
done
if [ "${AUD:-0}" -ge 1 ]; then echo "  ✅ SC-07 notif phục hồi & bù được audit ($AUD bản ghi)"; PASS=$((PASS+1)); else echo "  ❌ SC-07 audit chưa bù (nhận $AUD)"; FAIL=$((FAIL+1)); fi

echo "SC-08: Sai assignee Approve -> từ chối"
C8=SC08-$SFX
code /contracts $SALE POST "{\"code\":\"$C8\",\"customer_code\":\"KH0001\",\"title\":\"a\"}" >/dev/null
body /contracts/$C8 $SALE PUT '{"effective_from":"2026-07-01","effective_to":"2026-12-31","has_attachment":true}' >/dev/null
body /contracts/$C8/submit $SALE POST >/dev/null
TID=$(body /tasks/inbox $MGR | jget 'd[0]["id"]')
R=$(body /tasks/$TID/approve $OPS POST '{"comment":"x"}' | jget 'd["error"]["code"]')
check "SC-08 sai assignee bị chặn" "$R" "NOT_ASSIGNEE"

echo "SC-09: Submit nhiều lần -> chỉ một workflow"
C9=SC09-$SFX
code /contracts $SALE POST "{\"code\":\"$C9\",\"customer_code\":\"KH0001\",\"title\":\"d\"}" >/dev/null
body /contracts/$C9 $SALE PUT '{"effective_from":"2026-07-01","effective_to":"2026-12-31","has_attachment":true}' >/dev/null
R1=$(code /contracts/$C9/submit $SALE POST)
R2=$(code /contracts/$C9/submit $SALE POST)
check "SC-09 submit lần 1 OK" "$R1" "200"
check "SC-09 submit lần 2 bị chặn (409)" "$R2" "409"

echo "SC-10: Phụ lục hiệu lực 01/10 nhưng tính tháng 09 -> dùng giá cũ"
P9=$(body "/pricing/effective?customer_code=KH0001&service_code=DV003&date=2026-09-15" $SALE | jget 'int(d["unit_price"])')
P10=$(body "/pricing/effective?customer_code=KH0001&service_code=DV003&date=2026-10-15" $SALE | jget 'int(d["unit_price"])')
check "SC-10 tháng 09 dùng giá cũ 120000" "$P9" "120000"
check "SC-10 tháng 10 dùng giá mới 150000" "$P10" "150000"

echo "===== KẾT QUẢ: $PASS PASS / $FAIL FAIL ====="
[ "$FAIL" -eq 0 ]
