export default function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="rules-modal" role="dialog" aria-modal="true">
      <div className="rules-panel">
        <h2>Règles de Shadow Hunters</h2>
        <button onClick={onClose}>Fermer</button>
        <div className="rules-sections">
          <section>
            <h3>Objectif</h3>
            <p>Les Chasseurs éliminent toutes les Ombres. Les Ombres éliminent tous les Chasseurs. Les Neutres poursuivent leur objectif personnel.</p>
          </section>
          <section>
            <h3>Déroulement d'un tour</h3>
            <ol>
              <li>Lancer le dé à 4 faces pour se déplacer.</li>
              <li>Sur un 7, choisir librement une zone.</li>
              <li>Résoudre l'action de la zone (piocher une carte, soigner, attaquer, voler).</li>
              <li>Attaquer un joueur sur la même zone (dé 4 faces, 4+ = 1 dégât).</li>
              <li>Fin de tour.</li>
            </ol>
          </section>
          <section>
            <h3>Zones</h3>
            <ul>
              <li>Cabane de l'Ermite : piocher une carte Ermite.</li>
              <li>Porte des Enfers : piocher dans le deck de son choix.</li>
              <li>Église : piocher une carte Blanche.</li>
              <li>Cimetière : piocher une carte Noire.</li>
              <li>Bois Étrangers : soigner 1 dégât ou infliger 2 dégâts.</li>
              <li>Autel d'Antan : voler un équipement.</li>
            </ul>
          </section>
          <section>
            <h3>Conditions de victoire</h3>
            <ul>
              <li>Chasseurs : toutes les Ombres mortes.</li>
              <li>Ombres : tous les Chasseurs morts.</li>
              <li>Neutres : objectif personnel selon le personnage.</li>
            </ul>
          </section>
        </div>
        <p className="note">Ce panneau n'interrompt pas la partie et ne modifie aucun état serveur.</p>
      </div>
    </div>
  )
}