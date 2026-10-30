export function HowWeFarm() {
  return (
    <section className="how" aria-labelledby="how-title">
      <h2 className="section-title" id="how-title">
        How we farm
      </h2>
      <div className="how__body">
        <p className="how__lead">No synthetic sprays, no cold storage, and nothing picked before someone has ordered it.</p>
        <dl className="how__list">
          <div>
            <dt>Soil first</dt>
            <dd>We feed the ground with compost from the farm’s own cows and leaf litter, and grow pulses between rows in the off season.</dd>
          </div>
          <div>
            <dt>Picked to order</dt>
            <dd>Orders close Monday night. We pick on Tuesday morning, pack by afternoon, and it reaches you by Thursday.</dd>
          </div>
          <div>
            <dt>Certified, and honest about it</dt>
            <dd>Most of the farm is certified organic. The vineyard is in its second year of conversion, and we label it that way.</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
