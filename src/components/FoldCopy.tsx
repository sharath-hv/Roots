import { BRAND } from '../config';

/** `sequenced`: the lines share one spot and the scroll timeline hands from one to the next. */
export function FoldCopy({ sequenced = false }: { sequenced?: boolean }) {
  return (
    <div className={`fold ${sequenced ? 'fold--sequenced' : ''}`}>
      <div className="fold__inner">
        <h1 className="fold__line">Grown slowly, picked when it’s ready.</h1>
        <p className="fold__line">
          Mangoes, oranges, grapes, strawberries and cut flowers from our farm near {BRAND.place.split(',')[0]}.
        </p>
        <p className="fold__line">Picked on Tuesday, at your door by Thursday.</p>
      </div>
    </div>
  );
}
