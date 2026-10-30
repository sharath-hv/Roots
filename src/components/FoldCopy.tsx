/** `sequenced`: the lines share one spot and the scroll timeline hands from one to the next. */
export function FoldCopy({ sequenced = false }: { sequenced?: boolean }) {
  return (
    <div className={`fold ${sequenced ? 'fold--sequenced' : ''}`}>
      <div className="fold__inner">
        <h1 className="fold__line">
          <em className="hl">Grown slowly</em>, picked when it’s ready.
        </h1>
        <p className="fold__line">
          Mangoes, oranges, grapes, strawberries and cut flowers from <em className="hl">our farm</em>.
        </p>
        <p className="fold__line">
          Picked on Tuesday, <em className="hl">at your door</em> by Thursday.
        </p>
      </div>
    </div>
  );
}
