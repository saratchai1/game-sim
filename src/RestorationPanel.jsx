import { CREW, crewLeft, crewRule, contractOffers, contractProgress, habitatFor, ACHIEVEMENTS, forecastFor } from './restoration.js'

export function RestorationPanel({ game, onOpen, onClaim }) {
  const contract = contractProgress(game)
  const habitat = habitatFor(game)
  return <section className="restoration-card">
    <div className="eyebrow">RESTORATION FIELDWORK <span>{crewLeft(game)}/2 ทีมว่าง</span></div>
    <h3>{contract ? contract.title : 'วันนี้จะคืนอะไรให้อ่าว?'}</h3>
    {contract ? <><p>{contract.text} · เหลือ {contract.daysLeft} วัน</p><div className="mission-progress"><i style={{ width: `${contract.value / contract.goal * 100}%` }} /></div><div className="contract-summary"><span>{contract.value.toFixed(contract.id === 'carbon' ? 1 : 0)}/{contract.goal}</span><b>+{contract.coins + contract.bonus} ●</b></div></> : <p>{game.expedition.lastOutcome?.type === 'expired' ? 'งานก่อนหมดเวลา เลือกแผนใหม่ได้เลย' : 'เลือกงาน 3 วัน แล้วแบ่งทีมดูแลป่า'}</p>}
    <button className="field-plan-button" onClick={contract?.ready ? onClaim : onOpen} disabled={Boolean(game.event)}>{contract?.ready ? 'ส่งมอบงาน · รับรางวัล' : 'วางแผนภาคสนาม'} <span>↗</span></button>
    <div className="habitat-mini"><span>{habitat.name}</span><b>{habitat.score}%</b></div>
    <div className="habitat-track"><i style={{ width: `${habitat.score}%` }} /></div>
  </section>
}

export function RestorationModal({ game, onAccept, onClaim, onCrew }) {
  const c = contractProgress(game)
  const forecast = forecastFor(game.day)
  return <>
    <small>FIELD STATION / DAY {game.day}</small><h2>ให้ทุกวันมีความหมาย</h2>
    <p className="planning-intro">ทีมทำได้วันละ 2 งาน · ปลูกและบำรุงรายแปลงได้แยกต่างหาก · ไม่มีเวลาจริงบังคับ</p>
    <div className="plan-section-title"><h3>01 / เลือกเป้าหมาย 3 วัน</h3><span>สำเร็จแล้ว {game.expedition.completed} งาน</span></div>
    {c ? <div className="active-contract"><div><b>{c.title}</b><p>{c.text} · {c.value.toFixed(c.id === 'carbon' ? 1 : 0)}/{c.goal}</p><small>ส่งก่อนจบวันที่ {c.deadline} · +{c.coins + c.bonus} ● · +{c.xp} XP</small></div><button onClick={onClaim} disabled={!c.ready || Boolean(game.event)}>ส่งมอบงาน</button></div> : <div className="contract-offers">{contractOffers(game).map((offer) => <button key={offer.id} disabled={game.expedition.offerDay === game.day || Boolean(game.event)} onClick={() => onAccept(offer.id)}><small>3 GAME DAYS</small><b>{offer.title}</b><p>{offer.text}</p><span>+{offer.coins} ● · +{offer.xp} XP</span><strong>รับงานนี้ →</strong></button>)}</div>}
    {!c && game.expedition.offerDay === game.day && <p className="plan-hint">ส่งงานวันนี้แล้ว · บอร์ดงานใหม่เปิดวันถัดไป</p>}
    {game.expedition.lastOutcome && <p className="plan-hint" role="status">{game.expedition.lastOutcome.type === 'complete' ? `✓ ส่งมอบ “${game.expedition.lastOutcome.title}” แล้ว +${game.expedition.lastOutcome.coins} เหรียญ` : `หมดเวลางาน “${game.expedition.lastOutcome.title}” · ไม่มีค่าปรับ เลือกรอบใหม่ได้`}</p>}
    <p className="contract-streak">ส่งสำเร็จต่อเนื่อง {game.expedition.streak} งาน · โบนัสงานถัดไป +{Math.min(45, game.expedition.streak * 15)} ● <small>หมดเวลาเฉพาะวันในเกม จะรีเซ็ตโบนัสต่อเนื่อง</small></p>
    <div className="plan-section-title"><h3>02 / จัดทีมลงพื้นที่</h3><span>{crewLeft(game)} / 2 งานคงเหลือ</span></div>
    <div className="crew-grid">{Object.entries(CREW).map(([key, spec], i) => {
      const rule = crewRule(game, key)
      return <button key={key} data-crew={key} onClick={() => onCrew(key)} disabled={!rule.ok} className={rule.unlocked ? '' : 'locked'}><span className="crew-symbol">{['♧', '❧', '≋', '⌕'][i]}</span><span><b>{spec.name} <em>{spec.cost ? `${spec.cost} ●` : 'ฟรี'}</em></b><small>{spec.hint}</small><strong>{rule.reason || 'ใช้ทีม 1 งาน →'}</strong></span></button>
    })}</div>
    {game.expedition.protectionDay >= game.day && <p className="plan-hint">✓ แนวป้องกันพร้อมถึงเหตุการณ์วันที่ {game.expedition.protectionDay}</p>}
    <p className="plan-hint">น้ำวันนี้: {forecast.tide} · งานทีมและรางวัลบันทึกอัตโนมัติ</p>
    <div className="plan-section-title"><h3>03 / สมุดความสำเร็จ</h3><span>{game.expedition.achievements.length}/{ACHIEVEMENTS.length}</span></div>
    <div className="achievement-grid">{ACHIEVEMENTS.map((a) => <div key={a.id} className={game.expedition.achievements.includes(a.id) ? 'earned' : ''}><span>{game.expedition.achievements.includes(a.id) ? '✦' : '◇'}</span><b>{a.name}</b><small>{a.text}</small><em>+{a.xp} XP · ครั้งเดียว</em></div>)}</div>
  </>
}
