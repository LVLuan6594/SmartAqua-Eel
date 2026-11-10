import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Pencil, Plus } from 'lucide-react';
import { Badge, Button, Card, Confirm, Empty, Modal, NextLink, PageTitle, SearchBox, Select, Status, Table, toast } from '../components/UI';
import { useDemo, getLabel } from '../store/demoStore';
import { canWrite, dateVi, daysSince, num, scoped } from '../domain/selectors';
import { finishFarmingCycle, getOpenCycleForPond, saveFarmingCycle } from '../services/farmingOperationsService';
import { createId } from '../utils/createId';

export default function Cycles() {
  const { db, role } = useDemo();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const presetPondId = params.get('pond') || '';
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(presetPondId);
  const [editing, setEditing] = useState<any>(null);
  const [complete, setComplete] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [discardOpen, setDiscardOpen] = useState(false);
  const canManageCycles = canWrite(role, 'farmingCycles');
  const allowedPonds = scoped(db, role, 'ponds');
  const initialForm = React.useRef('');

  const cycles = useMemo(
    () => scoped(db, role, 'farmingCycles')
      .filter((cycle) => (!filter || cycle.pondId === filter)
        && `${cycle.code} ${getLabel(db, 'ponds', cycle.pondId)} ${getLabel(db, 'species', cycle.speciesId)}`
          .toLocaleLowerCase('vi')
          .includes(query.toLocaleLowerCase('vi')))
      .sort((a, b) => b.stockingDate.localeCompare(a.stockingDate)),
    [db, role, filter, query],
  );

  const open = (cycle?: any) => {
    const pondId = cycle?.pondId || presetPondId || allowedPonds[0]?.id || '';
    if (!cycle && pondId && getOpenCycleForPond(pondId)) {
      toast('Bể nuôi này đang có một vụ nuôi chưa kết thúc. Vui lòng hoàn tất vụ hiện tại trước khi tạo vụ mới.', 'error');
      return;
    }

    const next = cycle ? { ...cycle } : {
      id: createId('cycle'),
      code: `VU-${String(db.farmingCycles.length + 1).padStart(3, '0')}`,
      pondId,
      speciesId: 'SP1',
      seedBatchId: db.seedBatches[0]?.id,
      stockingDate: new Date().toISOString().slice(0, 10),
      stockingQuantity: Math.round(Number(allowedPonds.find(p=>p.id===pondId)?.areaM2||20)*350),
      status: 'active',
      notes: '',
    };
    initialForm.current = JSON.stringify(next);
    setEditing(cycle || {});
    setForm(next);
  };

  React.useEffect(() => {
    if (params.get('add') !== '1') return;
    open();
    const next = new URLSearchParams(params);
    next.delete('add');
    setParams(next, { replace: true });
  }, []);

  const requestClose = () => {
    if (JSON.stringify(form) !== initialForm.current) {
      setDiscardOpen(true);
      return;
    }
    setEditing(null);
  };

  const discardChanges = () => {
    setDiscardOpen(false);
    setEditing(null);
  };

  const save = () => {
    if (!form.pondId || !form.speciesId || !form.stockingDate || Number(form.stockingQuantity) <= 0) {
      toast('Vui lòng nhập đầy đủ thông tin thả giống.', 'error');
      return;
    }
    if (db.farmingCycles.some((cycle: any) => cycle.code === form.code && cycle.id !== form.id)) {
      toast('Mã vụ nuôi đã tồn tại.', 'error');
      return;
    }

    const typicalDays = db.species.find((species: any) => species.id === form.speciesId)?.typicalDays || 110;
    const expectedHarvestDate = new Date(`${form.stockingDate}T00:00:00Z`);
    expectedHarvestDate.setUTCDate(expectedHarvestDate.getUTCDate() + typicalDays);

    try {
      saveFarmingCycle({
        ...form,
        stockingQuantity: Number(form.stockingQuantity),
        expectedHarvestDate: expectedHarvestDate.toISOString().slice(0, 10),
      });
      setEditing(null);
      initialForm.current = '';
      toast('Đã lưu thông tin vụ nuôi.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể lưu vụ nuôi.', 'error');
    }
  };

  const finish = () => {
    if (!complete) return;
    try {
      finishFarmingCycle(complete.id);
      setComplete(null);
      toast('Đã xác nhận hoàn tất vụ nuôi.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Không thể kết thúc vụ nuôi.', 'error');
    }
  };

  return (
    <>
      <PageTitle
        kicker="VÒNG ĐỜI NUÔI TRỒNG"
        title="Quản lý vụ nuôi"
        description="Quản lý nguồn giống, ngày thả, trạng thái, tiến trình và lịch sử vụ nuôi theo từng ao."
        actions={canManageCycles
          ? <Button onClick={() => open()}><Plus size={16} /> Khởi tạo vụ nuôi</Button>
          : <Badge>Chỉ xem</Badge>}
      />

      <Card>
        <div className="filters">
          <SearchBox value={query} onChange={setQuery} placeholder="Mã vụ, bể hoặc loài..." />
          <Select
            value={filter}
            onChange={setFilter}
            options={allowedPonds.map((pond) => ({ value: pond.id, label: `${pond.code} · ${pond.name}` }))}
            allLabel="Tất cả bể nuôi"
          />
          <Badge tone="blue">{cycles.length} vụ</Badge>
        </div>
        {cycles.length ? (
          <Table headers={['Mã vụ', 'Bể nuôi', 'Loài nuôi', 'Nguồn giống', 'Ngày thả', 'Số ngày', 'Số con', 'Trạng thái', 'Thao tác']}>
            {cycles.map((cycle) => (
              <tr key={cycle.id}>
                <td><b>{cycle.code}</b></td>
                <td><NextLink onClick={() => navigate(`/ponds/${cycle.pondId}`)}>{getLabel(db, 'ponds', cycle.pondId)}</NextLink></td>
                <td>{getLabel(db, 'species', cycle.speciesId)}</td>
                <td>{getLabel(db, 'seedBatches', cycle.seedBatchId, 'code')}</td>
                <td>{dateVi(cycle.stockingDate)}</td>
                <td>{daysSince(cycle.stockingDate)}</td>
                <td>{num(cycle.stockingQuantity)}</td>
                <td><Status status={cycle.status} /></td>
                <td>
                  <div className="table-actions">
                    {canManageCycles && (
                      <>
                        <button className="icon-button" title="Sửa vụ nuôi" onClick={() => open(cycle)}><Pencil size={16} /></button>
                        {cycle.status !== 'completed' && (
                          <button className="icon-button" title="Hoàn tất vụ" onClick={() => setComplete(cycle)}><CheckCircle2 size={17} /></button>
                        )}
                      </>
                    )}
                    <button className="icon-button" title="Nhật ký" onClick={() => navigate(`/diaries?pond=${cycle.pondId}`)}><CalendarDays size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        ) : <Empty />}
      </Card>

      <div style={{ height: 17 }} />
      <Card title="Chu trình vòng đời vụ nuôi" subtitle="Ví dụ về các mốc nghiệp vụ được mô phỏng">
        <div className="timeline">
          {[
            ['1', 'Khởi tạo'],
            ['2', 'Thả giống'],
            ['3', 'Ghi nhật ký'],
            ['4', 'Theo dõi tăng trưởng'],
            ['5', 'Thu hoạch'],
            ['6', 'Hoàn tất'],
          ].map(([number, label], index) => (
            <div key={number} className={`timeline-step ${index < 3 ? 'active' : ''}`}>
              <b>{number}. {label}</b>
              <span>Giai đoạn {number}</span>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        title={editing?.code ? `Chỉnh sửa vụ ${editing.code}` : 'Khởi tạo vụ nuôi'}
        open={editing !== null}
        onClose={requestClose}
        wide
        className="pond-detail-dialog"
        closeOnBackdrop={false}
      >
        <div className="form-grid">
          <div className="field">
            <label>Mã vụ *</label>
            <input value={form.code || ''} onChange={(event) => setForm((value: any) => ({ ...value, code: event.target.value }))} />
          </div>
          <div className="field">
            <label>Bể nuôi *</label>
            <Select
              value={form.pondId || ''}
              onChange={(value) => setForm((current: any) => ({ ...current, pondId: value }))}
              options={allowedPonds.map((pond) => ({ value: pond.id, label: `${pond.code} · ${pond.name}` }))}
            />
          </div>
          <div className="field">
            <label>Loài thủy sản *</label>
            <Select
              value={form.speciesId || ''}
              onChange={(value) => setForm((current: any) => ({ ...current, speciesId: value }))}
              options={db.species.map((species: any) => ({ value: species.id, label: species.name }))}
            />
          </div>
          <div className="field">
            <label>Lô con giống</label>
            <Select
              value={form.seedBatchId || ''}
              onChange={(value) => setForm((current: any) => ({ ...current, seedBatchId: value }))}
              options={db.seedBatches
                .filter((batch: any) => batch.speciesId === form.speciesId)
                .map((batch: any) => ({ value: batch.id, label: batch.code }))}
            />
          </div>
          <div className="field">
            <label>Ngày thả *</label>
            <input type="date" value={form.stockingDate || ''} onChange={(event) => setForm((value: any) => ({ ...value, stockingDate: event.target.value }))} />
          </div>
          <div className="field">
            <label>Số lượng giống thả (con) *</label>
            <input type="number" min={1} value={form.stockingQuantity || ''} onChange={(event) => setForm((value: any) => ({ ...value, stockingQuantity: Number(event.target.value) }))} />
          </div>
          <div className="field">
            <label>Trạng thái</label>
            <Select
              value={form.status || 'active'}
              onChange={(value) => setForm((current: any) => ({ ...current, status: value }))}
              options={[
                { value: 'preparing', label: 'Chuẩn bị' },
                { value: 'active', label: 'Đang nuôi' },
                { value: 'harvesting', label: 'Đang thu hoạch' },
                { value: 'completed', label: 'Hoàn thành' },
                { value: 'paused', label: 'Tạm dừng' },
              ]}
            />
          </div>
          <div className="field">
            <label>Ghi chú</label>
            <input value={form.notes || ''} onChange={(event) => setForm((value: any) => ({ ...value, notes: event.target.value }))} />
          </div>
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={requestClose}>Hủy</Button>
          <Button onClick={save}>Lưu vụ nuôi</Button>
        </div>
      </Modal>

      <Modal
        title="Bạn có thay đổi chưa được lưu"
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        className="pond-detail-dialog"
        closeOnBackdrop={false}
      >
        <p>Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn đóng biểu mẫu không?</p>
        <div className="modal-footer">
          <Button variant="secondary" onClick={() => setDiscardOpen(false)}>Tiếp tục chỉnh sửa</Button>
          <Button variant="danger" onClick={discardChanges}>Bỏ thay đổi</Button>
        </div>
      </Modal>

      <Confirm
        open={complete !== null}
        title="Hoàn tất vụ nuôi"
        description={`Xác nhận kết thúc ${complete?.code}? Hệ thống sẽ kiểm tra đã có phiếu thu hoạch hợp lệ.`}
        onCancel={() => setComplete(null)}
        onConfirm={finish}
        closeOnBackdrop={false}
      />
    </>
  );
}
